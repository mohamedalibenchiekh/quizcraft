import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ─── Mock the OpenAI SDK BEFORE importing any module that uses it ────
vi.mock("openai", () => {
  const mockCreate = vi.fn();
  return {
    default: class OpenAI {
      constructor() {
        this.chat = {
          completions: {
            create: mockCreate,
          },
        };
      }
    },
    __mockCreate: mockCreate,
  };
});

// Retrieve the mock handle for per-test configuration
const { __mockCreate: mockCreate } = await import("openai");
const { default: app } = await import("../app.js");

// ─── Test fixtures ──────────────────────────────────────
const JWT_SECRET = "supersecretfortesting";
process.env.JWT_SECRET = JWT_SECRET;

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

const mockAiResponse = {
  questions: [
    {
      question: "What is machine learning a subset of?",
      type: "MCQ",
      options: [
        "Artificial Intelligence",
        "Data Science",
        "Robotics",
        "Statistics",
      ],
      answer: "Artificial Intelligence",
      difficulty: "medium",
    },
    {
      question: "Supervised learning uses labeled training data.",
      type: "True-False",
      options: ["True", "False"],
      answer: "True",
      difficulty: "medium",
    },
    {
      question: "What are neural networks inspired by?",
      type: "Short-Answer",
      options: [],
      answer: "biological neural structures",
      difficulty: "medium",
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
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      });

      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.questions).toHaveLength(3);

      // Verify schema structure of each question
      for (const q of res.body.questions) {
        expect(q).toHaveProperty("text");
        expect(q).toHaveProperty("type");
        expect(q).toHaveProperty("options");
        expect(q).toHaveProperty("correctAnswer");
        expect(q).toHaveProperty("difficulty");
        expect(q).toHaveProperty("tags");
        expect(["MCQ", "True-False", "Short-Answer"]).toContain(q.type);
      }
    });

    it("should call OpenAI with response_format json_object and the system prompt", async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      });

      await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send(validPayload);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: "json_object" },
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({ role: "user" }),
          ]),
        })
      );
    });
  });

  // ─── Test Case 2: Input Validation Gate ────────────────
  describe("Input Validation Gate", () => {
    it("should return 400 when 'text' is missing", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ numQuestions: 3, difficulty: "easy" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/text/i);
      // OpenAI should NOT be called
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should return 400 when 'text' is an empty string", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "   ", numQuestions: 3, difficulty: "easy" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/text/i);
    });

    it("should return 400 when 'numQuestions' is missing or invalid", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "Some content", difficulty: "easy" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/numQuestions/i);
    });

    it("should return 400 when 'numQuestions' is zero or negative", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "Some content", numQuestions: -1, difficulty: "easy" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/numQuestions/i);
    });

    it("should return 400 when 'difficulty' is invalid", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${professorToken}`)
        .send({ text: "Some content", numQuestions: 3, difficulty: "extreme" });

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
      expect(mockCreate).not.toHaveBeenCalled();
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
    it("should return 500 when the OpenAI SDK throws a network/timeout error", async () => {
      mockCreate.mockRejectedValueOnce(new Error("Request timed out"));

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
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "This is a completely broken JSON output from LLM.",
            },
          },
        ],
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
      const mixedAiResponse = {
        questions: [
          {
            // Valid question block
            question: "Valid interrogation?",
            type: "MCQ",
            options: ["A", "B", "C", "D"],
            answer: "A",
            difficulty: "medium",
          },
          {
            // Corrupt question block (missing answer / correctAnswer)
            question: "Corrupted interrogation without answer",
            type: "MCQ",
            options: ["A", "B"],
            difficulty: "medium",
          },
          {
            // Corrupt question block (MCQ answer doesn't match choices)
            question: "Incorrect MCQ choices mapping",
            type: "MCQ",
            options: ["A", "B"],
            answer: "C",
            difficulty: "medium",
          },
        ],
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mixedAiResponse),
            },
          },
        ],
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
