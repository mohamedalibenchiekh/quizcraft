import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

process.env.JWT_SECRET = "supersecretfortesting";

describe("PUT /api/quizzes/:id — Quiz Update Endpoint", () => {
  let mongoServer;
  let professorId;
  let otherProfId;
  let professorToken;
  let otherProfessorToken;
  let quizId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    professorId = new mongoose.Types.ObjectId();
    otherProfId = new mongoose.Types.ObjectId();

    professorToken = jwt.sign(
      { id: professorId.toString(), role: "professor" },
      process.env.JWT_SECRET
    );

    otherProfessorToken = jwt.sign(
      { id: otherProfId.toString(), role: "professor" },
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

    // Create a base quiz with one question for testing
    const question = await new Question({
      text: "What is 2 + 2?",
      type: "MCQ",
      options: ["3", "4", "5", "6"],
      correctAnswer: "4",
      difficulty: "easy",
    }).save();

    const quiz = await new Quiz({
      title: "Original Quiz Title",
      description: "Original description",
      professorId: professorId,
      questions: [question._id],
    }).save();

    quizId = quiz._id;
  });

  describe("Success Path — Owner updates quiz", () => {
    it("should update title, description, and questions atomically and return 200", async () => {
      const updatePayload = {
        title: "Updated Quiz Title",
        description: "Updated description",
        questions: [
          {
            text: "What is the capital of France?",
            type: "MCQ",
            options: ["London", "Paris", "Berlin", "Madrid"],
            correctAnswer: "Paris",
            difficulty: "medium",
            tags: ["geography"],
          },
          {
            text: "Earth is flat.",
            type: "True-False",
            options: ["True", "False"],
            correctAnswer: "False",
            difficulty: "easy",
          },
        ],
      };

      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .set("Authorization", `Bearer ${professorToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Updated Quiz Title");
      expect(res.body.data.description).toBe("Updated description");
      expect(res.body.data.questions).toHaveLength(2);
      expect(res.body.data.questions[0].text).toBe("What is the capital of France?");
      expect(res.body.data.questions[0].correctAnswer).toBe("Paris");
      expect(res.body.data.questions[1].type).toBe("True-False");
      expect(res.body.data.questions[1].correctAnswer).toBe("False");

      // Verify persistence in DB
      const updatedQuiz = await Quiz.findById(quizId).populate("questions");
      expect(updatedQuiz.title).toBe("Updated Quiz Title");
      expect(updatedQuiz.questions).toHaveLength(2);
      expect(updatedQuiz.questions[0].text).toBe("What is the capital of France?");
    });

    it("should update only metadata when no questions array is provided", async () => {
      const updatePayload = {
        title: "Only Title Changed",
        description: "Only description changed",
      };

      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .set("Authorization", `Bearer ${professorToken}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Only Title Changed");
      expect(res.body.data.description).toBe("Only description changed");
      // Original question should remain
      expect(res.body.data.questions).toHaveLength(1);
    });

    it("should reject update with 400 when questions array is empty", async () => {
      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ title: "Test", questions: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/At least one question is required/i);
    });

    it("should reject update with 400 when a question has invalid type", async () => {
      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .set("Authorization", `Bearer ${professorToken}`)
        .send({
          title: "Test",
          questions: [
            { text: "Q?", type: "Essay", options: [], correctAnswer: "A", difficulty: "easy" },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Invalid question type/i);
    });

    it("should reject update with 400 when question text is missing", async () => {
      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .set("Authorization", `Bearer ${professorToken}`)
        .send({
          title: "Test",
          questions: [
            { type: "MCQ", options: ["A", "B"], correctAnswer: "A", difficulty: "easy" },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Question text is required/i);
    });
  });

  describe("Cross-Tenant Theft Defense", () => {
    it("should return 403 Forbidden when a different professor attempts to edit the quiz", async () => {
      const updatePayload = {
        title: "Maliciously modified title",
        questions: [
          { text: "Hacked?", type: "MCQ", options: ["Yes", "No"], correctAnswer: "Yes", difficulty: "easy" },
        ],
      };

      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .set("Authorization", `Bearer ${otherProfessorToken}`)
        .send(updatePayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Forbidden — You do not own this quiz");

      // Verify original data remains intact
      const quizInDB = await Quiz.findById(quizId);
      expect(quizInDB.title).toBe("Original Quiz Title");
    });

    it("should return 403 Forbidden for metadata-only update by another professor", async () => {
      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .set("Authorization", `Bearer ${otherProfessorToken}`)
        .send({ title: "Stolen title" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Forbidden — You do not own this quiz");
    });
  });

  describe("Authorization guards", () => {
    it("should return 401 without a token", async () => {
      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .send({ title: "No auth" });

      expect(res.status).toBe(401);
    });

    it("should return 401 with a student token (requires professor role)", async () => {
      const studentToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), role: "student" },
        process.env.JWT_SECRET
      );

      const res = await request(app)
        .put(`/api/quizzes/${quizId}`)
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ title: "Student attempt" });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("professor");
    });
  });

  describe("Not Found", () => {
    it("should return 404 when quiz does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/quizzes/${fakeId}`)
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ title: "Ghost quiz" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
