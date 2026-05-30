import { generateQuizFromPrompt } from "./geminiService.js";

/**
 * Generates quiz questions from course text using the Gemini API.
 *
 * @param {object} params
 * @param {string} params.text         — Raw extracted text from uploaded documents.
 * @param {number} params.numQuestions — Number of questions to generate.
 * @param {string} params.difficulty   — Target difficulty: "easy" | "medium" | "hard".
 * @returns {Promise<object[]>} Array of question objects matching the Mongoose schema.
 */
export const generateQuestions = async ({ text, numQuestions, difficulty }) => {
  return generateQuizFromPrompt(text, numQuestions, difficulty);
};

// Dummy exports for backward compatibility and testing
export const getOpenAIClient = () => null;
export const SYSTEM_PROMPT = "";
