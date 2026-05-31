import { GoogleGenAI } from "@google/genai";

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const sanitizeAnswer = (text) =>
  String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.?"]+$/, "");

export const evaluateShortAnswerWithAI = async (question, correctKey, studentInput) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert academic evaluator grading a short-answer quiz question.

Question: "${question}"
Expected Correct Answer: "${correctKey}"
Student's Submitted Answer: "${studentInput}"

Analyze if the student's answer is semantically accurate, factually equivalent, or represents a natural language variation of the expected answer. Account for minor spelling typos, missing articles, or full-sentence wrapping.

Respond strictly with a valid JSON object matching this schema:`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            isCorrect: { type: "BOOLEAN" },
            confidenceScore: { type: "NUMBER" },
            feedback: { type: "STRING" },
          },
          required: ["isCorrect", "feedback"],
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini short-answer evaluation failed, defaulting to false:", error);
    return { isCorrect: false, feedback: "Error processing answer evaluation." };
  }
};
