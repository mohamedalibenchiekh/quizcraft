import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@google/genai", () => {
  const mockGenerateContent = vi.fn();
  return {
    GoogleGenAI: vi.fn().mockImplementation(function () {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    }),
    __mockGenerateContent: mockGenerateContent,
  };
});

const { __mockGenerateContent: mockGenerateContent } = await import("@google/genai");
const { evaluateShortAnswer } = await import("../services/shortAnswerEvaluator.js");

describe("evaluateShortAnswer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  it("should use Gemini semantic grading for paraphrased short answers", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        isCorrect: true,
        feedback: "The paraphrase satisfies the criteria.",
      }),
    });

    const result = await evaluateShortAnswer({
      correctAnswer: "Photosynthesis converts light energy into chemical energy.",
      selectedAnswer: "Plants use sunlight to make stored chemical energy.",
    });

    expect(result.isCorrect).toBe(true);
    expect(result.feedback).toMatch(/paraphrase/i);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json" },
      })
    );
  });
});
