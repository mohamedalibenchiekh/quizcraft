import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";
import Attempt from "../models/Attempt.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

process.env.JWT_SECRET = "supersecretfortesting";

describe("Student Role Access Control Tests", () => {
  let mongoServer;
  let studentToken;
  let professorToken;
  let studentId;
  let quizId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    studentId = new mongoose.Types.ObjectId();
    const profId = new mongoose.Types.ObjectId();

    studentToken = jwt.sign(
      { id: studentId.toString(), email: "student@test.com", role: "student" },
      process.env.JWT_SECRET
    );

    professorToken = jwt.sign(
      { id: profId.toString(), email: "prof@test.com", role: "professor" },
      process.env.JWT_SECRET
    );

    const question = await Question.create({
      text: "Sample question?",
      type: "MCQ",
      options: ["A", "B", "C", "D"],
      correctAnswer: "A",
      difficulty: "easy",
    });

    const quiz = await Quiz.create({
      title: "Test Quiz",
      description: "A test quiz",
      professorId: profId,
      questions: [question._id],
      isApproved: true,
    });

    quizId = quiz._id;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      if (key !== "questions" && key !== "quizzes") {
        await collections[key].deleteMany({});
      }
    }
  });

  describe("GET /api/attempts/my — Student own data access", () => {
    it("should return 200 and an empty array when student has no attempts", async () => {
      const res = await request(app)
        .get("/api/attempts/my")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it("should return 200 and the student's attempts when data exists", async () => {
      await Attempt.create({
        userId: studentId,
        quizId,
        answers: [{ questionId: new mongoose.Types.ObjectId(), selectedAnswer: "A", isCorrect: true }],
        score: 1,
        totalQuestions: 1,
        scoreRatio: 1,
      });

      const res = await request(app)
        .get("/api/attempts/my")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].quizId).toBeDefined();
    });
  });

  describe("GET /api/attempts/stats — Student performance summary", () => {
    it("should return 200 with zeroed stats when student has no attempts", async () => {
      const res = await request(app)
        .get("/api/attempts/stats")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.totalQuizzes).toBe(0);
      expect(res.body.data.averageScoreRatio).toBe(0);
      expect(res.body.data.trophies).toBe(0);
    });

    it("should return 200 with accurate computed stats from multiple attempts", async () => {
      await Attempt.create({
        userId: studentId,
        quizId,
        answers: [],
        score: 8,
        totalQuestions: 10,
        scoreRatio: 0.8,
        adaptiveTriggered: true,
        adaptiveType: "enrichment",
      });

      await Attempt.create({
        userId: studentId,
        quizId,
        answers: [],
        score: 6,
        totalQuestions: 10,
        scoreRatio: 0.6,
        adaptiveTriggered: false,
        adaptiveType: "none",
      });

      const res = await request(app)
        .get("/api/attempts/stats")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalQuizzes).toBe(2);
      expect(res.body.data.averageScoreRatio).toBe(70);
      expect(res.body.data.trophies).toBe(1);
    });
  });

  describe("GET /api/attempts/:id — Student single attempt access", () => {
    it("should return 403 when student tries to view another student's attempt", async () => {
      const otherStudentId = new mongoose.Types.ObjectId();
      const otherToken = jwt.sign(
        { id: otherStudentId.toString(), email: "other@test.com", role: "student" },
        process.env.JWT_SECRET
      );

      const attempt = await Attempt.create({
        userId: studentId,
        quizId,
        answers: [],
        score: 5,
        totalQuestions: 10,
        scoreRatio: 0.5,
      });

      const res = await request(app)
        .get(`/api/attempts/${attempt._id}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 200 with full attempt details when accessing own attempt", async () => {
      const question = await Question.create({
        text: "What is 2+2?",
        type: "MCQ",
        options: ["3", "4", "5"],
        correctAnswer: "4",
        difficulty: "easy",
      });

      const localQuiz = await Quiz.create({
        title: "Math Quiz",
        description: "Basic math",
        professorId: new mongoose.Types.ObjectId(),
        questions: [question._id],
        isApproved: true,
      });

      const attempt = await Attempt.create({
        userId: studentId,
        quizId: localQuiz._id,
        answers: [{ questionId: question._id, selectedAnswer: "4", isCorrect: true }],
        score: 1,
        totalQuestions: 1,
        scoreRatio: 1,
      });

      const res = await request(app)
        .get(`/api/attempts/${attempt._id}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quizTitle).toBe("Math Quiz");
      expect(res.body.data.answers).toHaveLength(1);
      expect(res.body.data.answers[0].isCorrect).toBe(true);
      expect(res.body.data.answers[0].questionText).toBe("What is 2+2?");
    });
  });

  describe("Professor-locked endpoint gating", () => {
    it("should return 403 when student tries to create a quiz (POST /api/quizzes)", async () => {
      const res = await request(app)
        .post("/api/quizzes")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          title: "Should be blocked",
          questions: [{ text: "Q?", type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy" }],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/);
    });

    it("should return 403 when student tries to access admin quiz listing (GET /api/quizzes)", async () => {
      const res = await request(app)
        .get("/api/quizzes")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when student tries to start a session (POST /api/sessions/start)", async () => {
      const res = await request(app)
        .post("/api/sessions/start")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ quizId: new mongoose.Types.ObjectId().toString() });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Unauthenticated access", () => {
    it("should return 401 when no token is provided for student endpoints", async () => {
      const res = await request(app).get("/api/attempts/my");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
