import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";
import Attempt from "../models/Attempt.js";

process.env.JWT_SECRET = "supersecretfortesting";

const COMMON_TAGS = ["math", "algebra"];

async function seedQuestions(difficulty, count = 6) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    docs.push({
      text: `${difficulty} question ${i + 1}`,
      type: "MCQ",
      options: ["A", "B", "C", "D"],
      correctAnswer: "A",
      difficulty,
      tags: COMMON_TAGS,
    });
  }
  return Question.insertMany(docs);
}

describe("POST /api/attempts/submit — Adaptive Difficulty Engine", () => {
  let mongoServer;
  let studentId;
  let studentToken;
  let quizId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    studentId = new mongoose.Types.ObjectId();
    studentToken = jwt.sign(
      { id: studentId.toString(), role: "student" },
      process.env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe("QC-BR-04 — Remediation Trigger (ratio < 0.50)", () => {
    it("should return status=remediation with simplified questions when score is 25%", async () => {
      // Seed easy questions in bank for fallback query
      await seedQuestions("easy", 5);

      // Create quiz with 4 medium questions
      const mediumQs = await Question.insertMany([
        { text: "Medium Q1", type: "MCQ", options: ["A", "B", "C", "D"], correctAnswer: "A", difficulty: "medium", tags: COMMON_TAGS },
        { text: "Medium Q2", type: "MCQ", options: ["A", "B", "C", "D"], correctAnswer: "B", difficulty: "medium", tags: COMMON_TAGS },
        { text: "Medium Q3", type: "MCQ", options: ["A", "B", "C", "D"], correctAnswer: "C", difficulty: "medium", tags: COMMON_TAGS },
        { text: "Medium Q4", type: "MCQ", options: ["A", "B", "C", "D"], correctAnswer: "D", difficulty: "medium", tags: COMMON_TAGS },
      ]);

      const quiz = await Quiz.create({
        title: "Algebra Basics",
        description: "Test",
        professorId: new mongoose.Types.ObjectId(),
        questions: mediumQs.map((q) => q._id),
      });
      quizId = quiz._id;

      // Submit with only 1 correct out of 4 (25% ratio)
      const payload = {
        quizId: quizId.toString(),
        answers: [
          { questionId: mediumQs[0]._id, selectedAnswer: "A" },
          { questionId: mediumQs[1]._id, selectedAnswer: "X" },
          { questionId: mediumQs[2]._id, selectedAnswer: "Y" },
          { questionId: mediumQs[3]._id, selectedAnswer: "Z" },
        ],
      };

      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("remediation");
      expect(res.body.message).toBe("Remediation block unlocked.");
      expect(res.body.ratio).toBe(0.25);
      expect(res.body.data.adaptiveTriggered).toBe(true);
      expect(res.body.data.adaptiveType).toBe("remediation");
      expect(res.body.data.scoreRatio).toBe(0.25);
      expect(res.body.data.correctCount).toBe(1);

      // Assert remediation block has simplified questions
      expect(res.body).toHaveProperty("adaptiveQuestions");
      expect(res.body).toHaveProperty("adaptiveDeck");
      expect(Array.isArray(res.body.adaptiveQuestions)).toBe(true);
      expect(res.body.adaptiveQuestions.length).toBeGreaterThan(0);
      expect(res.body.adaptiveQuestions.length).toBeLessThanOrEqual(5);
      expect(res.body.adaptiveDeck).toEqual(res.body.adaptiveQuestions);

      // All returned questions must be difficulty "easy"
      for (const q of res.body.adaptiveQuestions) {
        expect(q.difficulty).toBe("easy");
      }

      // Verify attempt was persisted in DB
      const attempt = await Attempt.findById(res.body.data.attemptId);
      expect(attempt).not.toBeNull();
      expect(attempt.adaptiveTriggered).toBe(true);
      expect(attempt.adaptiveType).toBe("remediation");
      expect(attempt.scoreRatio).toBe(0.25);
    });

    it("should fallback to general easy questions if no easy questions match the specific quiz tags", async () => {
      // Seed easy questions with NO tags or mismatched tags
      await Question.insertMany([
        { text: "Fallback Easy Q1", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy", tags: ["unrelated"] },
        { text: "Fallback Easy Q2", type: "MCQ", options: ["A", "B"], correctAnswer: "B", difficulty: "easy", tags: ["mismatched"] },
      ]);

      // Create quiz with 2 medium questions
      const mediumQs = await Question.insertMany([
        { text: "Medium Q1", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "medium", tags: ["algebra"] },
        { text: "Medium Q2", type: "MCQ", options: ["A", "B"], correctAnswer: "B", difficulty: "medium", tags: ["algebra"] },
      ]);

      const quiz = await Quiz.create({
        title: "Algebra Basics Fallback",
        professorId: new mongoose.Types.ObjectId(),
        questions: mediumQs.map((q) => q._id),
      });

      // Submit with 0 correct out of 2 (0% ratio)
      const payload = {
        quizId: quiz._id.toString(),
        answers: [
          { questionId: mediumQs[0]._id, selectedAnswer: "X" },
          { questionId: mediumQs[1]._id, selectedAnswer: "Y" },
        ],
      };

      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("remediation");
      expect(res.body).toHaveProperty("adaptiveDeck");
      expect(res.body.adaptiveDeck.length).toBeGreaterThan(0);
      expect(res.body.adaptiveDeck[0].difficulty).toBe("easy");
    });
  });

  describe("QC-BR-05 — Enrichment Trigger (ratio > 0.85)", () => {
    it("should return status=enrichment with advanced questions when score is 100%", async () => {
      // Seed hard questions in bank for fallback query
      await seedQuestions("hard", 5);

      // Create quiz with 4 easy questions
      const easyQs = await Question.insertMany([
        { text: "Easy Q1", type: "MCQ", options: ["A", "B", "C", "D"], correctAnswer: "A", difficulty: "easy", tags: COMMON_TAGS },
        { text: "Easy Q2", type: "MCQ", options: ["A", "B", "C", "D"], correctAnswer: "B", difficulty: "easy", tags: COMMON_TAGS },
        { text: "Easy Q3", type: "MCQ", options: ["A", "B", "C", "D"], correctAnswer: "C", difficulty: "easy", tags: COMMON_TAGS },
        { text: "Easy Q4", type: "MCQ", options: ["A", "B", "C", "D"], correctAnswer: "D", difficulty: "easy", tags: COMMON_TAGS },
      ]);

      const quiz = await Quiz.create({
        title: "Simple Math",
        description: "Test",
        professorId: new mongoose.Types.ObjectId(),
        questions: easyQs.map((q) => q._id),
      });
      quizId = quiz._id;

      // Submit with 4 correct out of 4 (100% ratio)
      const payload = {
        quizId: quizId.toString(),
        answers: [
          { questionId: easyQs[0]._id, selectedAnswer: "A" },
          { questionId: easyQs[1]._id, selectedAnswer: "B" },
          { questionId: easyQs[2]._id, selectedAnswer: "C" },
          { questionId: easyQs[3]._id, selectedAnswer: "D" },
        ],
      };

      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe("enrichment");
      expect(res.body.message).toBe("Advanced variant block triggered!");
      expect(res.body.ratio).toBe(1);
      expect(res.body.data.adaptiveTriggered).toBe(true);
      expect(res.body.data.adaptiveType).toBe("enrichment");
      expect(res.body.data.scoreRatio).toBe(1);
      expect(res.body.data.correctCount).toBe(4);

      // Assert enrichment block has advanced questions
      expect(res.body).toHaveProperty("adaptiveQuestions");
      expect(res.body).toHaveProperty("adaptiveDeck");
      expect(Array.isArray(res.body.adaptiveQuestions)).toBe(true);
      expect(res.body.adaptiveQuestions.length).toBeGreaterThan(0);
      expect(res.body.adaptiveQuestions.length).toBeLessThanOrEqual(5);
      expect(res.body.adaptiveDeck).toEqual(res.body.adaptiveQuestions);

      // All returned questions must be difficulty "hard"
      for (const q of res.body.adaptiveQuestions) {
        expect(q.difficulty).toBe("hard");
      }

      // Verify attempt was persisted in DB
      const attempt = await Attempt.findById(res.body.data.attemptId);
      expect(attempt).not.toBeNull();
      expect(attempt.adaptiveTriggered).toBe(true);
      expect(attempt.adaptiveType).toBe("enrichment");
      expect(attempt.scoreRatio).toBe(1);
    });

    it("should fallback to general hard questions if no hard questions match the specific quiz tags", async () => {
      // Seed hard questions with NO tags or mismatched tags
      await Question.insertMany([
        { text: "Fallback Hard Q1", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "hard", tags: ["unrelated"] },
        { text: "Fallback Hard Q2", type: "MCQ", options: ["A", "B"], correctAnswer: "B", difficulty: "hard", tags: ["mismatched"] },
      ]);

      // Create quiz with 2 easy questions
      const easyQs = await Question.insertMany([
        { text: "Easy Q1", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy", tags: ["algebra"] },
        { text: "Easy Q2", type: "MCQ", options: ["A", "B"], correctAnswer: "B", difficulty: "easy", tags: ["algebra"] },
      ]);

      const quiz = await Quiz.create({
        title: "Algebra Basics Fallback Enrichment",
        professorId: new mongoose.Types.ObjectId(),
        questions: easyQs.map((q) => q._id),
      });

      // Submit with 2 correct out of 2 (100% ratio)
      const payload = {
        quizId: quiz._id.toString(),
        answers: [
          { questionId: easyQs[0]._id, selectedAnswer: "A" },
          { questionId: easyQs[1]._id, selectedAnswer: "B" },
        ],
      };

      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("enrichment");
      expect(res.body).toHaveProperty("adaptiveDeck");
      expect(res.body.adaptiveDeck.length).toBeGreaterThan(0);
      expect(res.body.adaptiveDeck[0].difficulty).toBe("hard");
    });
  });

  describe("Standard Path (0.50 <= ratio <= 0.85)", () => {
    it("should return status=standard without adaptiveQuestions when ratio is 50%", async () => {
      const qs = await Question.insertMany([
        { text: "Q1", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "medium", tags: ["general"] },
        { text: "Q2", type: "MCQ", options: ["A", "B"], correctAnswer: "B", difficulty: "medium", tags: ["general"] },
      ]);

      const quiz = await Quiz.create({
        title: "Standard Path",
        professorId: new mongoose.Types.ObjectId(),
        questions: qs.map((q) => q._id),
      });

      const payload = {
        quizId: quiz._id.toString(),
        answers: [
          { questionId: qs[0]._id, selectedAnswer: "A" },
          { questionId: qs[1]._id, selectedAnswer: "X" },
        ],
      };

      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("standard");
      expect(res.body.data.adaptiveTriggered).toBe(false);
      expect(res.body.data.adaptiveType).toBe("none");
      expect(res.body).not.toHaveProperty("adaptiveQuestions");
    });
  });

  describe("Validation guards", () => {
    it("should return 400 when quizId is missing", async () => {
      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ answers: [] });

      expect(res.status).toBe(400);
    });

    it("should return 401 without a token", async () => {
      const res = await request(app)
        .post("/api/attempts/submit")
        .send({ quizId: new mongoose.Types.ObjectId(), answers: [{ questionId: new mongoose.Types.ObjectId(), selectedAnswer: "A" }] });

      expect(res.status).toBe(401);
    });

    it("should return 404 for a non-existent quiz", async () => {
      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          quizId: new mongoose.Types.ObjectId().toString(),
          answers: [{ questionId: new mongoose.Types.ObjectId(), selectedAnswer: "A" }],
        });

      expect(res.status).toBe(404);
    });
  });
});
