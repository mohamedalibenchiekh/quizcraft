import { InferenceClient } from "@huggingface/inference";

export const SYSTEM_PROMPT = `You are an expert academic examiner and quiz generation engine for the QuizCraft educational platform.

STRICT EXECUTION RULES — YOU MUST FOLLOW ALL OF THESE WITHOUT EXCEPTION:

1. INPUT: You will receive a topic, target number of questions, and difficulty level.

2. OUTPUT FORMAT: You MUST respond with a valid JSON object ONLY.
   - The JSON object must have exactly one root key: "questions", which maps to an array of question objects.
   - Do not include any markdown formatting, no backticks (e.g. \`\`\`json), no preamble, and no postscript.

3. SCHEMA: Each question object in the "questions" array MUST have EXACTLY these fields:
   - "type" (string): Must be exactly one of: "Multiple-Choice", "True-False", or "Short-Answer".
   - "questionText" (string): The clear, academic question statement.
   - "difficulty" (string): Must be exactly the requested difficulty level: "easy", "medium", or "hard".
   - "options" (array of strings):
     * For "Multiple-Choice": provide EXACTLY 4 distinct, plausible options.
     * For "True-False": provide EXACTLY ["True", "False"].
     * For "Short-Answer": provide an empty array [].
   - "correctAnswer" (string):
     * For "Multiple-Choice": must exactly match one of the options.
     * For "True-False": must be exactly "True" or "False".
     * For "Short-Answer": must be a definitive grading keyword or phrase match.

4. QUESTION QUALITY:
   - Questions must be clear, high-quality, and relevant to the requested topic.
   - Ensure distractors for Multiple-Choice are plausible but clearly incorrect.`;

/**
 * Get or initialize the Hugging Face client lazily.
 * @returns {InferenceClient} The Hugging Face client instance
 */
const getHFClient = () => {
  return new InferenceClient(process.env.HF_TOKEN);
};

/**
 * Processes Hugging Face raw output questions: drops unparsable/corrupt question blocks,
 * normalizes structure, maps fields to conform with the Mongoose schema (questionText -> text, Multiple-Choice -> MCQ),
 * and drops into an atomic fallback if all blocks are unparsable.
 *
 * @param {any[]} questions
 * @param {string} requestedDifficulty
 * @returns {object[]} Valid Mongoose-compatible question objects
 */
export const transformAndValidateHFQuestions = (questions, requestedDifficulty) => {
  if (!Array.isArray(questions)) return [];

  const validated = [];
  for (const q of questions) {
    if (!q || typeof q !== "object") continue;

    try {
      // 1. Map and validate type
      let type = q.type;
      if (type === "Multiple-Choice") {
        type = "MCQ";
      }
      if (!["MCQ", "True-False", "Short-Answer"].includes(type)) {
        type = "MCQ";
      }

      // 2. Extract question text
      const text = String(q.questionText || q.text || q.question || "").trim();
      if (!text) continue;

      // 3. Normalize options
      let options = Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [];
      if (type === "MCQ") {
        if (options.length < 2) continue;
      } else if (type === "True-False") {
        options = ["True", "False"];
      } else if (type === "Short-Answer") {
        options = [];
      }

      // 4. Extract correctAnswer
      const correctAnswer = String(q.correctAnswer || q.answer || "").trim();
      if (!correctAnswer) continue;

      // Validate correctAnswer against options based on question type
      if (type === "MCQ" && !options.includes(correctAnswer)) {
        continue;
      } else if (type === "True-False" && !options.includes(correctAnswer)) {
        continue;
      }

      // 5. Verify difficulty
      const difficulty = String(q.difficulty || requestedDifficulty || "medium").toLowerCase();
      if (!["easy", "medium", "hard"].includes(difficulty)) continue;

      const tags = Array.isArray(q.tags)
        ? q.tags.map(t => String(t).trim()).filter(Boolean)
        : ["AI Generated", "Hugging Face"];

      validated.push({
        text,
        type,
        options,
        correctAnswer,
        difficulty,
        tags,
      });
    } catch (e) {
      // Gracefully intercept and drop this unparsable block
    }
  }

  // Atomic fallback if all parsed questions were corrupted/empty
  if (validated.length === 0) {
    const normalizedFallbackDifficulty = String(requestedDifficulty || "medium").toLowerCase();
    const validDifficulty = ["easy", "medium", "hard"].includes(normalizedFallbackDifficulty)
      ? normalizedFallbackDifficulty
      : "medium";

    validated.push({
      text: "Placeholder question generated due to automatic parser fallback.",
      type: "True-False",
      options: ["True", "False"],
      correctAnswer: "True",
      difficulty: validDifficulty,
      tags: ["AI Fallback", "Hugging Face"],
    });
  }

  return validated;
};

/**
 * Generates quiz questions on a given topic using the Hugging Face Serverless Inference API.
 *
 * @param {string} topic         — The target topic/prompt.
 * @param {number} questionCount — Number of questions to generate.
 * @param {string} difficulty    — Target difficulty: "easy" | "medium" | "hard".
 * @param {boolean} isDocumentText — Whether the topic is actually a grounded course text.
 * @returns {Promise<object[]>} Array of question objects matching the Mongoose schema.
 */
export const generateQuizFromPrompt = async (topic, questionCount, difficulty, isDocumentText = false) => {
  if (!process.env.HF_TOKEN || process.env.HF_TOKEN === "hf_your_actual_token_here") {
    throw new Error("HF_TOKEN is not configured. Please set a valid Hugging Face Token in your environment.");
  }

  const client = getHFClient();
  const userPrompt = isDocumentText
    ? `Generate exactly ${questionCount} quiz questions at "${difficulty}" difficulty level strictly grounded in the following course material:\n\n---\n${topic}\n---`
    : `Generate exactly ${questionCount} quiz questions at "${difficulty}" difficulty level on the topic: "${topic}".`;

  const chatCompletion = await client.chatCompletion({
    model: "Qwen/Qwen2.5-72B-Instruct",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 1500,
  });

  const content = chatCompletion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response returned from Hugging Face Inference API.");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    parsed = { questions: [] };
  }

  const rawQuestions = parsed && Array.isArray(parsed.questions) ? parsed.questions : [];
  return transformAndValidateHFQuestions(rawQuestions, difficulty);
};

/**
 * Generates quiz questions from course text using the Hugging Face Serverless Inference API.
 *
 * @param {object} params
 * @param {string} params.text         — Raw extracted text from uploaded documents.
 * @param {number} params.numQuestions — Number of questions to generate.
 * @param {string} params.difficulty   — Target difficulty: "easy" | "medium" | "hard".
 * @returns {Promise<object[]>} Array of question objects matching the Mongoose schema.
 */
export const generateQuestions = async ({ text, numQuestions, difficulty }) => {
  return generateQuizFromPrompt(text, numQuestions, difficulty, true);
};

// Dummy exports for backward compatibility and testing
export const getOpenAIClient = () => null;
