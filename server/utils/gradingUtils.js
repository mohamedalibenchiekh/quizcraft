import { evaluateShortAnswer } from "../services/shortAnswerEvaluator.js";

export const sanitizeAnswer = (text) =>
  String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.?"]+$/, "");

export const evaluateShortAnswerWithAI = async (question, correctKey, studentInput) =>
  evaluateShortAnswer({
    questionText: question,
    correctAnswer: correctKey,
    selectedAnswer: studentInput,
  });
