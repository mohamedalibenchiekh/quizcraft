import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ─── Mock the Google Gen AI SDK BEFORE importing any module that uses it ────
vi.mock("@google/generative-ai", () => {
  const mockGenerateContent = vi.fn();
  return {
    GoogleGenAI: class GoogleGenAI {
      constructor() {
        this.models = {
          generateContent: mockGenerateContent,
        };
      }
    },
    __mockGenerateContent: mockGenerateContent,
  };
});

// Retrieve the mock handle for per-test configuration
const { __mockGenerateContent: mockGenerateContent } = await import("@google/generative-ai");
const { default: app } = await import("../app.js");

// ─── Test fixtures ──────────────────────────────────────
const JWT_SECRET = "supersecretfortesting";
process.env.JWT_SECRET = JWT_SECRET;
process.env.GEMINI_API_KEY = "AIzaSyMockKeyForGeminiAPIIntegration2026";

const professorToken = jwt.sign(
  { id: "prof-001", role: "professor" },
  JWT_SECRET
);

const studentToken = jwt.sign(
  { id: "stu-001", role: "student" },
  JWT_SECRET
);

const validPayload = {
  text: "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. Supervised learning uses labeled training data to map inputs to outputs. Neural networks are inspired by biological neural structures.",
  numQuestions: 3,
  difficulty: "medium",
};

const mockGeminiResponse = {
  questions: [
    {
      type: "Multiple-Choice",
      questionText: "What is machine learning a subset of?",
      difficulty: "medium",
      options: [
        "Artificial Intelligence",
        "Data Science",
        "Robotics",
        "Statistics",
      ],
      correctAnswer: "Artificial Intelligence",
    },
    {
      type: "True-False",
      questionText: "Supervised learning uses labeled training data.",
      difficulty: "medium",
      options: ["True", "False"],
      correctAnswer: "True",
    },
    {
      type: "Short-Answer",
      questionText: "What are neural networks inspired by?",
      difficulty: "medium",
      options: [],
      correctAnswer: "biological neural structures",
    },
  ],
};

describe("POST /api/ai/generate — AI Quiz Generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Test Case 1: Success Flow ─────────────────────────
  describe("Success Flow", () => {
    it("should return 200 with structured questions array when given valid input and professor token", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockGeminiResponse),
      });

      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.questions).toBeInstanceOf(Array);
      expect(res.body.questions).toHaveLength(3);

      // Validate schema compliance
      const [q1, q2, q3] = res.body.questions;

      expect(q1.text).toBe("What is machine learning a subset of?");
      expect(q1.type).toBe("MCQ");
      expect(q1.options).toEqual([
        "Artificial Intelligence",
        "Data Science",
        "Robotics",
        "Statistics",
      ]);
      expect(q1.correctAnswer).toBe("Artificial Intelligence");
      expect(q1.difficulty).toBe("medium");

      expect(q2.text).toBe("Supervised learning uses labeled training data.");
      expect(q2.type).toBe("True-False");
      expect(q2.options).toEqual(["True", "False"]);
      expect(q2.correctAnswer).toBe("True");
      expect(q2.difficulty).toBe("medium");

      expect(q3.text).toBe("What are neural networks inspired by?");
      expect(q3.type).toBe("Short-Answer");
      expect(q3.options).toEqual([]);
      expect(q3.correctAnswer).toBe("biological neural structures");
      expect(q3.difficulty).toBe("medium");
    });
  });

  // ─── Input Validation Guards ───────────────────────────
  describe("Input Validation Guards", () => {
    it("should return 400 when 'text' is missing", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ numQuestions: 3, difficulty: "medium" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/text/i);
    });

    it("should return 400 when 'text' is empty string", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "   ", numQuestions: 3, difficulty: "medium" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/text/i);
    });

    it("should return 400 when 'numQuestions' is missing", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "Some content", difficulty: "medium" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/numQuestions/i);
    });

    it("should return 400 when 'numQuestions' is negative", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "Some content", numQuestions: -5, difficulty: "medium" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/numQuestions/i);
    });

    it("should return 400 when 'numQuestions' is a float", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "Some content", numQuestions: 2.5, difficulty: "medium" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/numQuestions/i);
    });

    it("should return 400 when 'difficulty' is invalid value", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "Some content", numQuestions: 3, difficulty: "expert" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/difficulty/i);
    });

    it("should return 400 when 'difficulty' is missing", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "Some content", numQuestions: 3 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/difficulty/i);
    });

    it("should return 400 when 'text' exceeds maximum length", async () => {
      const longText = "x".repeat(50001);
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: longText, numQuestions: 3, difficulty: "easy" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/maximum length/i);
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });

  // ─── Auth & Role Guards ────────────────────────────────
  describe("Authentication & Role Guards", () => {
    it("should return 401 when no token is provided", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should return 403 when a student token is provided", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── SDK Error Handling ────────────────────────────────
  describe("SDK Error Handling", () => {
    it("should return 500 when the Gemini SDK throws a network/timeout error", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Request timed out"));

      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send(validPayload);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ─── Defensive Parsing & Fallbacks ─────────────────────
  describe("Defensive Parsing & Fallbacks", () => {
    it("should recover gracefully and return fallback placeholder question when LLM returns invalid/broken JSON", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: "This is a completely broken JSON output from LLM.",
      });

      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.questions[0].text).toContain("Placeholder question generated due to automatic parser fallback");
      expect(res.body.questions[0].type).toBe("True-False");
      expect(res.body.questions[0].correctAnswer).toBe("True");
    });

    it("should drop corrupted/unparsable question blocks and keep the valid ones", async () => {
      const mixedGeminiResponse = {
        questions: [
          {
            // Valid question block
            type: "Multiple-Choice",
            questionText: "Valid interrogation?",
            options: ["A", "B", "C", "D"],
            correctAnswer: "A",
            difficulty: "medium",
          },
          {
            // Corrupt question block (missing answer / correctAnswer)
            type: "Multiple-Choice",
            questionText: "Corrupted interrogation without answer",
            options: ["A", "B"],
            difficulty: "medium",
          },
          {
            // Corrupt question block (MCQ answer doesn't match choices)
            type: "Multiple-Choice",
            questionText: "Incorrect MCQ choices mapping",
            options: ["A", "B"],
            correctAnswer: "C",
            difficulty: "medium",
          },
        ],
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mixedGeminiResponse),
      });

      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // It should drop the 2 corrupt ones, and keep only the 1 valid one
      expect(res.body.questions).toHaveLength(1);
      expect(res.body.questions[0].text).toBe("Valid interrogation?");
      expect(res.body.questions[0].correctAnswer).toBe("A");
    });
  });
});
