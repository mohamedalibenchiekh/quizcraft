import OpenAI from "openai";

// ─── Client initialisation ──────────────────────────────
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── System prompt template ─────────────────────────────
/**
 * Strict system instruction set that constrains the LLM to behave as an
 * expert academic examiner producing machine-parseable JSON output only.
 * Satisfies QC-BR-02 format structure.
 */
const SYSTEM_PROMPT = `You are an expert academic examiner and quiz generation engine for an educational platform called QuizCraft.

STRICT EXECUTION RULES — YOU MUST FOLLOW ALL OF THESE WITHOUT EXCEPTION:

1. INPUT: You will receive raw text extracted from course documents along with target parameters (difficulty level and number of questions to generate).

2. OUTPUT FORMAT: You MUST respond with a raw, valid, minified JSON object ONLY.
   - DO NOT wrap the output in markdown code fences (no \`\`\`json blocks).
   - DO NOT include any conversational preamble, explanation, or postscript.
   - DO NOT include any text outside the JSON object.

3. SCHEMA: The JSON output MUST be a single object containing one key "questions" mapped to an array. Each element in the array MUST have EXACTLY these fields matching this signature blueprint:
   - "question" (string): A clear, academic interrogation statement derived from the source material.
   - "type" (string): MUST be strictly one of: "MCQ", "True-False", or "Short-Answer".
   - "options" (array of strings):
     * For "MCQ": provide EXACTLY 4 distinct, plausible options.
     * For "True-False": provide EXACTLY ["True", "False"].
     * For "Short-Answer": provide an empty array [].
   - "answer" (string): MUST exactly match one of the options for MCQ/True-False, or be the definitive keyword/phrase for Short-Answer.
   - "difficulty" (string): MUST exactly match the requested difficulty parameter: "easy", "medium", or "hard".

4. QUESTION QUALITY:
   - Questions must be directly grounded in the provided text content.
   - Vary question types across MCQ, True-False, and Short-Answer for diversity.
   - Ensure distractors (wrong MCQ options) are plausible but clearly incorrect.

5. STRICT COMPLIANCE: Any deviation from the above schema will cause a system failure. Do not add extra keys, omit required keys, or alter the value types.`;

// ─── Schema validation & transformation interceptor ──────
/**
 * Processes LLM raw output questions: drops unparsable/corrupt question blocks,
 * normalizes structure, maps fields to conform with the Mongoose schema (question -> text, answer -> correctAnswer),
 * and drops into an atomic fallback if all blocks are unparsable.
 *
 * @param {any[]} questions
 * @param {string} requestedDifficulty
 * @returns {object[]} Valid Mongoose-compatible question objects
 */
export const transformAndValidateAiQuestions = (questions, requestedDifficulty) => {
  if (!Array.isArray(questions)) return [];

  const validated = [];
  for (const q of questions) {
    if (!q || typeof q !== "object") continue;

    try {
      // 1. Validate type or fallback to MCQ
      let type = q.type;
      if (!type || !["MCQ", "True-False", "Short-Answer"].includes(type)) {
        type = "MCQ";
      }

      // 2. Extract question text (accept 'question' as per QC-BR-02, fallback to 'text')
      const text = String(q.question || q.text || "").trim();
      if (!text) continue; // Drop block if no interrogation statement exists

      // 3. Normalize options
      let options = Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [];
      if (type === "MCQ") {
        if (options.length < 2) continue; // Drop invalid MCQ options array
      } else if (type === "True-False") {
        options = ["True", "False"];
      } else if (type === "Short-Answer") {
        options = [];
      }

      // 4. Extract correctAnswer (accept 'answer' as per QC-BR-02, fallback to 'correctAnswer')
      const correctAnswer = String(q.answer || q.correctAnswer || "").trim();
      if (!correctAnswer) continue; // Drop block if no answer exists

      if (type === "MCQ" && !options.includes(correctAnswer)) {
        continue; // Drop if correctAnswer is not one of the choices
      }

      // 5. Verify difficulty
      const difficulty = String(q.difficulty || requestedDifficulty || "medium").toLowerCase();
      if (!["easy", "medium", "hard"].includes(difficulty)) continue;

      // Extract optional tags if returned, or default to AI Gen
      const tags = Array.isArray(q.tags)
        ? q.tags.map(t => String(t).trim()).filter(Boolean)
        : ["AI Generated"];

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

  // Atomic fallback schema parser: if all generated questions were corrupted/empty,
  // drop into a clean, safe, valid baseline question to guarantee system reliability.
  if (validated.length === 0) {
    validated.push({
      text: "Placeholder question generated due to automatic parser fallback.",
      type: "True-False",
      options: ["True", "False"],
      correctAnswer: "True",
      difficulty: requestedDifficulty || "medium",
      tags: ["AI Fallback"],
    });
  }

  return validated;
};

// ─── Generation function ────────────────────────────────
/**
 * Generates quiz questions from course text using the OpenAI Chat Completions API.
 *
 * @param {object} params
 * @param {string} params.text         — Raw extracted text from uploaded documents.
 * @param {number} params.numQuestions — Number of questions to generate.
 * @param {string} params.difficulty   — Target difficulty: "easy" | "medium" | "hard".
 * @returns {Promise<object[]>} Array of question objects matching the Mongoose schema.
 */
export const generateQuestions = async ({ text, numQuestions, difficulty }) => {
  const userPrompt = `Generate exactly ${numQuestions} quiz questions at "${difficulty}" difficulty level from the following course material:\n\n---\n${text}\n---`;

  let response;
  try {
    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (sdkError) {
    // Re-throw SDK network/timeout errors cleanly
    throw sdkError;
  }

  const content = response.choices[0].message.content;

  // ─── Safe JSON parsing with fallback ────────────────────
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (parseError) {
    // Defensive error handling: if LLM returns a broken string block,
    // we set parsed to { questions: [] } and let the schema validation
    // interceptor drop into the atomic fallback schema.
    parsed = { questions: [] };
  }

  // ─── Schema validation & transformation gate ─────────────
  const rawQuestions = parsed && Array.isArray(parsed.questions) ? parsed.questions : [];
  return transformAndValidateAiQuestions(rawQuestions, difficulty);
};

// Export for testing access
export { openai, SYSTEM_PROMPT };
