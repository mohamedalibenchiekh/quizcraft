import { ai } from './aiService.js';

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const evaluateShortAnswer = async ({ correctAnswer, selectedAnswer }) => {
  const correctStr = String(correctAnswer || '').trim();
  const selectedStr = String(selectedAnswer || '').trim();

  if (!selectedStr) {
    return { isCorrect: false, feedback: 'No answer provided.' };
  }

  if (normalize(selectedStr) === normalize(correctStr)) {
    return { isCorrect: true, feedback: 'Answer matches the expected response.' };
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return { isCorrect: false, feedback: 'Semantic grading unavailable.' };
  }

  try {
    const evaluation = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Grade this short-answer submission. Correct answer criteria: "${correctStr}". Student answer: "${selectedStr}". Respond strictly with a JSON object: { "isCorrect": true/false, "feedback": "Brief string" }`,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(evaluation.text || '{}');
    return {
      isCorrect: parsed.isCorrect === true,
      feedback:
        typeof parsed.feedback === 'string' && parsed.feedback.trim()
          ? parsed.feedback.trim()
          : 'Semantic grading completed.',
    };
  } catch (error) {
    return { isCorrect: false, feedback: 'Semantic grading failed.' };
  }
};
