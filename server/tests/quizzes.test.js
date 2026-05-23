import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import app from "../app.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

process.env.JWT_SECRET = "supersecretfortesting";

describe("Quiz CRUD API Integration Tests", () => {
  let mongoServer;
  let professorId;
  let otherProfId;
  let professorToken;
  let otherProfessorToken;

  beforeAll(async () => {
    // Start isolated MongoMemoryReplSet to cleanly support Mongoose transactions
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
  });

  describe("POST /api/quizzes (Create Quiz)", () => {
    it("should successfully create a new quiz and nested questions when carrying authentic professor token", async () => {
      const quizPayload = {
        title: "CS101 JavaScript Essentials",
        description: "Introduction to functional programming",
        questions: [
          {
            text: "Which keyword defines a constant variable?",
            type: "MCQ",
            options: ["var", "let", "const", "function"],
            correctAnswer: "const",
            difficulty: "easy",
            tags: ["js", "syntax"]
          },
          {
            text: "Is JavaScript single-threaded?",
            type: "True-False",
            options: ["True", "False"],
            correctAnswer: "True",
            difficulty: "medium"
          }
        ]
      };

      const res = await request(app)
        .post("/api/quizzes")
        .set("Authorization", `Bearer ${professorToken}`)
        .send(quizPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe(quizPayload.title);
      expect(res.body.data.professorId).toBe(professorId.toString());
      expect(res.body.data.questions).toHaveLength(2);
      expect(res.body.data.questions[0].text).toBe(quizPayload.questions[0].text);
      expect(res.body.data.questions[0].options).toContain("const");
      expect(res.body.data.questions[1].type).toBe("True-False");
    });
  });

  describe("GET /api/quizzes/:id (Get Quiz By ID)", () => {
    it("should fetch a single quiz and ensure Mongoose populate yields full nested data blocks", async () => {
      // 1. Manually seed a question
      const question = new Question({
        text: "What is 10 + 20?",
        type: "Short-Answer",
        correctAnswer: "30",
        difficulty: "easy"
      });
      const savedQuestion = await question.save();

      // 2. Manually seed a quiz referencing the question
      const quiz = new Quiz({
        title: "Math Basics",
        description: "Simple arithmetic",
        professorId: professorId,
        questions: [savedQuestion._id]
      });
      const savedQuiz = await quiz.save();

      // 3. Request the quiz
      const res = await request(app)
        .get(`/api/quizzes/${savedQuiz._id}`)
        .set("Authorization", `Bearer ${professorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(savedQuiz._id.toString());
      // Assert that the questions field has been populated with full objects rather than ObjectIds
      expect(res.body.data.questions).toHaveLength(1);
      expect(res.body.data.questions[0]._id).toBe(savedQuestion._id.toString());
      expect(res.body.data.questions[0].text).toBe("What is 10 + 20?");
      expect(res.body.data.questions[0].correctAnswer).toBe("30");
    });
  });

  describe("Boundary Guards & Ownership Checks", () => {
    let sharedQuizId;

    beforeEach(async () => {
      // Create a quiz owned by professorId
      const question = new Question({
        text: "Explain closures",
        type: "Short-Answer",
        correctAnswer: "lexical environment",
        difficulty: "hard"
      });
      const savedQuestion = await question.save();

      const quiz = new Quiz({
        title: "Advanced JavaScript",
        description: "Closures and Scopes",
        professorId: professorId,
        questions: [savedQuestion._id]
      });
      const savedQuiz = await quiz.save();
      sharedQuizId = savedQuiz._id;
    });

    it("should reject quiz update with 403 Forbidden if a professor attempts to update a quiz owned by a different professorId", async () => {
      const updatePayload = {
        title: "Maliciously modified title"
      };

      const res = await request(app)
        .put(`/api/quizzes/${sharedQuizId}`)
        .set("Authorization", `Bearer ${otherProfessorToken}`)
        .send(updatePayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Forbidden — You do not own this quiz");
    });

    it("should reject quiz deletion with 403 Forbidden if a professor attempts to delete a quiz owned by a different professorId", async () => {
      const res = await request(app)
        .delete(`/api/quizzes/${sharedQuizId}`)
        .set("Authorization", `Bearer ${otherProfessorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Forbidden — You do not own this quiz");

      // Verify the quiz still exists in DB
      const quizInDB = await Quiz.findById(sharedQuizId);
      expect(quizInDB).not.toBeNull();
    });
  });
});
