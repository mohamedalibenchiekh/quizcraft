import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Question from "../models/Question.js";
import Quiz from "../models/Quiz.js";

describe("Mongoose Schema Validation Tests", () => {
  let mongoServer;

  beforeAll(async () => {
    // Spin up an isolated, in-memory MongoDB database instance
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    // Tear down database connection and stop server
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean collections before each test run
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe("Question Schema Validation", () => {
    it("should fail validation if type is invalid (not in MCQ, True-False, Short-Answer enums)", async () => {
      const question = new Question({
        text: "What is 2+2?",
        type: "InvalidType", // Invalid type enum
        options: ["3", "4", "5"],
        correctAnswer: "4",
        difficulty: "easy"
      });

      let err = null;
      try {
        await question.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.type).toBeDefined();
      expect(err.errors.type.message).toContain("is not a valid enum value");
    });

    it("should fail validation if difficulty is invalid (not easy, medium, hard)", async () => {
      const question = new Question({
        text: "What is the capital of France?",
        type: "Short-Answer",
        correctAnswer: "Paris",
        difficulty: "super-hard" // Invalid difficulty enum
      });

      let err = null;
      try {
        await question.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.difficulty).toBeDefined();
      expect(err.errors.difficulty.message).toContain("is not a valid enum value");
    });

    it("should pass validation if type and difficulty are correct", async () => {
      const question = new Question({
        text: "Mongoose is an ODM.",
        type: "True-False",
        options: ["True", "False"],
        correctAnswer: "True",
        difficulty: "easy"
      });

      const saved = await question.save();
      expect(saved._id).toBeDefined();
      expect(saved.type).toBe("True-False");
      expect(saved.difficulty).toBe("easy");
    });
  });

  describe("Quiz Schema Validation", () => {
    it("should default isApproved to false", async () => {
      const quiz = new Quiz({
        title: "Introduction to Databases",
        description: "Covers SQL and NoSQL basics",
        professorId: new mongoose.Types.ObjectId(),
        questions: []
      });

      const savedQuiz = await quiz.save();
      expect(savedQuiz._id).toBeDefined();
      expect(savedQuiz.isApproved).toBe(false); // Default value verification
    });
  });
});
