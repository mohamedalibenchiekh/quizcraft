import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

// ─── Mock the Hugging Face SDK BEFORE importing any module that uses it ────
vi.mock("@huggingface/inference", () => {
    const mockChatCompletion = vi.fn();
    return {
        InferenceClient: class InferenceClient {
            constructor() {
                this.chatCompletion = mockChatCompletion;
            }
        },
        __mockChatCompletion: mockChatCompletion,
    };
});

const { __mockChatCompletion: mockChatCompletion } = await import("@huggingface/inference");
const { default: app } = await import("../app.js");
const { generateQuizFromPrompt, transformAndValidateHFQuestions } = await import("../services/aiService.js");

// ─── Test fixtures ──────────────────────────────────────
const JWT_SECRET = "supersecretfortesting";
process.env.JWT_SECRET = JWT_SECRET;
process.env.HF_TOKEN = "hf_mock_token_for_huggingface_integration_2026";

const professorToken = jwt.sign(
    { id: "prof-001", role: "professor" },
    JWT_SECRET
);

const studentToken = jwt.sign(
    { id: "stu-001", role: "student" },
    JWT_SECRET
);

const validPayload = {
    topic: "Geography",
    questionCount: 3,
    difficulty: "easy",
};

const mockGeminiResponse = {
    questions: [
        {
            type: "Multiple-Choice",
            questionText: "What is the capital of France?",
            difficulty: "easy",
            options: ["Paris", "London", "Berlin", "Madrid"],
            correctAnswer: "Paris",
        },
        {
            type: "True-False",
            questionText: "The earth is flat.",
            difficulty: "easy",
            options: ["True", "False"],
            correctAnswer: "False",
        },
        {
            type: "Short-Answer",
            questionText: "What is 2 + 2?",
            difficulty: "easy",
            options: [],
            correctAnswer: "4",
        }
    ],
};

describe("Hugging Face Service & API Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Service Layer: transformAndValidateHFQuestions", () => {
        it("should correctly map and validate valid HF questions to Mongoose schema", () => {
            const result = transformAndValidateHFQuestions(mockGeminiResponse.questions, "easy");

            expect(result).toHaveLength(3);

            // MCQ Check
            expect(result[0]).toEqual({
                text: "What is the capital of France?",
                type: "MCQ",
                options: ["Paris", "London", "Berlin", "Madrid"],
                correctAnswer: "Paris",
                difficulty: "easy",
                tags: ["AI Generated", "Hugging Face"],
            });

            // True-False Check
            expect(result[1]).toEqual({
                text: "The earth is flat.",
                type: "True-False",
                options: ["True", "False"],
                correctAnswer: "False",
                difficulty: "easy",
                tags: ["AI Generated", "Hugging Face"],
            });

            // Short-Answer Check
            expect(result[2]).toEqual({
                text: "What is 2 + 2?",
                type: "Short-Answer",
                options: [],
                correctAnswer: "4",
                difficulty: "easy",
                tags: ["AI Generated", "Hugging Face"],
            });
        });

        it("should fallback to atomic fallback question if input is invalid/empty", () => {
            const result = transformAndValidateHFQuestions([], "easy");
            expect(result).toHaveLength(1);
            expect(result[0].tags).toContain("AI Fallback");
            expect(result[0].type).toBe("True-False");
        });
    });

    describe("Service Layer: generateQuizFromPrompt", () => {
        it("should generate and transform quiz questions successfully", async () => {
            mockChatCompletion.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockGeminiResponse),
                        },
                    },
                ],
            });

            const questions = await generateQuizFromPrompt("Geography", 3, "easy");

            expect(questions).toHaveLength(3);
            expect(questions[0].type).toBe("MCQ");
            expect(questions[0].text).toBe("What is the capital of France?");
        });
    });

    describe("API Gateway: POST /api/quizzes/generate", () => {
        it("should successfully generate questions and return 200 for a professor", async () => {
            mockChatCompletion.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockGeminiResponse),
                        },
                    },
                ],
            });

            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${professorToken}`)
                .send(validPayload);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.questions).toHaveLength(3);
            expect(res.body.questions[0].type).toBe("MCQ");
        });

        it("should successfully generate questions and return 200 when topic is empty string but text is provided", async () => {
            mockChatCompletion.mockResolvedValueOnce({
                choices: [
                    {
                        message: {
                            content: JSON.stringify(mockGeminiResponse),
                        },
                    },
                ],
            });

            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${professorToken}`)
                .send({ topic: "", text: "Geography", questionCount: 3, difficulty: "easy" });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.questions).toHaveLength(3);
        });

        it("should return 400 if validation fails (missing topic)", async () => {
            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${professorToken}`)
                .send({ questionCount: 3, difficulty: "easy" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("topic");
        });

        it("should return 400 if validation fails (non-string topic)", async () => {
            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${professorToken}`)
                .send({ topic: 12345, questionCount: 3, difficulty: "easy" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("topic");
        });

        it("should return 400 if validation fails (non-string difficulty)", async () => {
            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${professorToken}`)
                .send({ topic: "Geography", questionCount: 3, difficulty: true });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("difficulty");
        });

        it("should return 400 if validation fails (questionCount is 0)", async () => {
            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${professorToken}`)
                .send({ topic: "Geography", questionCount: 0, difficulty: "easy" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("question count");
        });

        it("should return 400 if validation fails (invalid difficulty)", async () => {
            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${professorToken}`)
                .send({ topic: "Geography", questionCount: 3, difficulty: "super-hard" });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("difficulty");
        });

        it("should return 403 for student role", async () => {
            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${studentToken}`)
                .send(validPayload);

            expect(res.status).toBe(403);
        });

        it("should gracefully capture Hugging Face API errors and return 500 without crashing", async () => {
            mockChatCompletion.mockRejectedValueOnce(new Error("Rate limit exceeded"));

            const res = await request(app)
                .post("/api/quizzes/generate")
                .set("Authorization", `Bearer ${professorToken}`)
                .send(validPayload);

            expect(res.status).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain("AI service error");
            expect(res.body.error).toBe("Rate limit exceeded");
        });
    });
});
