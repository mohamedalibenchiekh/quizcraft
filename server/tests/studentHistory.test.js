import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import app from "../app.js";
import User from "../models/User.js";
import Attempt from "../models/Attempt.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

process.env.JWT_SECRET = "supersecretfortesting";

describe("Student Attempt Persistence & History Tests", () => {
  let mongoServer;
  let studentToken;
  let studentId;
  let quizId;
  let questionIds;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
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

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("password123", salt);

    const user = await User.create({
      name: "Test Student",
      email: "student@test.com",
      password: hashedPassword,
      role: "student",
    });
    studentId = user._id;

    studentToken = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const q1 = await Question.create({
      text: "What is 2+2?",
      type: "MCQ",
      options: ["3", "4", "5"],
      correctAnswer: "4",
      difficulty: "easy",
    });

    const q2 = await Question.create({
      text: "Is JavaScript single-threaded?",
      type: "True-False",
      options: ["True", "False"],
      correctAnswer: "True",
      difficulty: "medium",
    });

    questionIds = [q1._id, q2._id];

    const quiz = await Quiz.create({
      title: "Test History Quiz",
      description: "Quiz for persistence testing",
      professorId: new mongoose.Types.ObjectId(),
      questions: questionIds,
      isApproved: true,
    });
    quizId = quiz._id;
  });

  describe("POST /api/attempts/submit — Attempt persistence", () => {
    it("should persist an attempt record with the authenticated student's userId", async () => {
      const payload = {
        quizId: quizId.toString(),
        answers: [
          { questionId: questionIds[0].toString(), selectedAnswer: "4" },
          { questionId: questionIds[1].toString(), selectedAnswer: "True" },
        ],
      };

      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const attempt = await Attempt.findOne({ userId: studentId });
      expect(attempt).not.toBeNull();
      expect(attempt.userId.toString()).toBe(studentId.toString());
      expect(attempt.quizId.toString()).toBe(quizId.toString());
      expect(attempt.score).toBe(2);
      expect(attempt.totalQuestions).toBe(2);
      expect(attempt.scoreRatio).toBe(1);
    });

    it("should return 401 if no auth token is provided", async () => {
      const res = await request(app)
        .post("/api/attempts/submit")
        .send({
          quizId: quizId.toString(),
          answers: [{ questionId: questionIds[0].toString(), selectedAnswer: "4" }],
        });

      expect(res.status).toBe(401);
    });

    it("should return 400 for malformed request body", async () => {
      const res = await request(app)
        .post("/api/attempts/submit")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/attempts/my — History retrieval", () => {
    it("should return an empty array for a student with no attempts", async () => {
      const res = await request(app)
        .get("/api/attempts/my")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it("should return non-empty attempt history with quiz title metadata", async () => {
      await Attempt.create({
        userId: studentId,
        quizId,
        answers: [
          { questionId: questionIds[0], selectedAnswer: "4", isCorrect: true },
          { questionId: questionIds[1], selectedAnswer: "True", isCorrect: true },
        ],
        score: 2,
        totalQuestions: 2,
        scoreRatio: 1,
      });

      const res = await request(app)
        .get("/api/attempts/my")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);

      const attempt = res.body.data[0];
      expect(attempt.quizId).toBeDefined();
      expect(attempt.quizId.title).toBe("Test History Quiz");
      expect(attempt.score).toBe(2);
      expect(attempt.totalQuestions).toBe(2);
      expect(attempt.scoreRatio).toBe(1);
    });

    it("should only return attempts belonging to the authenticated student", async () => {
      const otherUserId = new mongoose.Types.ObjectId();

      await Attempt.create({
        userId: otherUserId,
        quizId,
        answers: [],
        score: 0,
        totalQuestions: 2,
        scoreRatio: 0,
      });

      await Attempt.create({
        userId: studentId,
        quizId,
        answers: [
          { questionId: questionIds[0], selectedAnswer: "4", isCorrect: true },
          { questionId: questionIds[1], selectedAnswer: "True", isCorrect: true },
        ],
        score: 2,
        totalQuestions: 2,
        scoreRatio: 1,
      });

      const res = await request(app)
        .get("/api/attempts/my")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].score).toBe(2);
    });
  });

  describe("GET /api/attempts/stats — Stats accuracy", () => {
    it("should return zeroed stats for student with no attempts", async () => {
      const res = await request(app)
        .get("/api/attempts/stats")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalQuizzes).toBe(0);
      expect(res.body.data.averageScoreRatio).toBe(0);
    });

    it("should reflect completed attempts in computed stats", async () => {
      await Attempt.create({
        userId: studentId,
        quizId,
        answers: [],
        score: 8,
        totalQuestions: 10,
        scoreRatio: 0.8,
      });

      await Attempt.create({
        userId: studentId,
        quizId,
        answers: [],
        score: 6,
        totalQuestions: 10,
        scoreRatio: 0.6,
      });

      const res = await request(app)
        .get("/api/attempts/stats")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalQuizzes).toBe(2);
      expect(res.body.data.averageScoreRatio).toBe(70);
    });
  });

  describe("GET /api/attempts/:id — Single attempt retrieval", () => {
    it("should return full attempt details with answer breakdown", async () => {
      const attempt = await Attempt.create({
        userId: studentId,
        quizId,
        answers: [
          { questionId: questionIds[0], selectedAnswer: "4", isCorrect: true },
          { questionId: questionIds[1], selectedAnswer: "False", isCorrect: false },
        ],
        score: 1,
        totalQuestions: 2,
        scoreRatio: 0.5,
      });

      const res = await request(app)
        .get(`/api/attempts/${attempt._id}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.quizTitle).toBe("Test History Quiz");
      expect(res.body.data.answers).toHaveLength(2);
      expect(res.body.data.answers[0].isCorrect).toBe(true);
      expect(res.body.data.answers[1].isCorrect).toBe(false);
      expect(res.body.data.answers[0].questionText).toBe("What is 2+2?");
      expect(res.body.data.answers[1].questionText).toBe("Is JavaScript single-threaded?");
    });
  });
});
