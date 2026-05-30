import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MAX_WORDS = 10000;
const GEMINI_REQUEST_TIMEOUT_MS = 120_000;

/**
 * Safely truncates text to a maximum word count to protect token limits.
 * Appends a truncation notice if the text was cut.
 *
 * @param {string} text     — The source text to truncate.
 * @param {number} maxWords — Maximum number of words allowed (default: 10000).
 * @returns {string} Truncated text, or the original if within limits.
 */
export const truncateText = (text, maxWords = MAX_WORDS) => {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "\n\n[Content truncated...]";
};

/**
 * Builds the full prompt for Gemini, combining instruction, question count,
 * difficulty, and source text/topic into a single content block.
 *
 * @param {string} topic         — The topic or document text.
 * @param {number} questionCount — Number of questions to generate.
 * @param {string} difficulty    — Target difficulty: "easy" | "medium" | "hard".
 * @param {boolean} isDocumentText — Whether topic is a grounded course document.
 * @returns {string} The combined prompt string.
 */
const buildPrompt = (topic, questionCount, difficulty, isDocumentText) => {
  const sourceLabel = isDocumentText ? "document text" : "topic";
  const sourceText = isDocumentText ? truncateText(topic) : topic;

  return `Generate a complete quiz based on the following ${sourceLabel}.

${sourceLabel === "document text" ? `Document:\n${sourceText}\n` : `Topic: ${topic}`}

Requirements:
- Exactly ${questionCount} questions at "${difficulty}" difficulty level.
- A descriptive title specific to the content.
- A 2-sentence description of what the quiz assesses.
- 3+ relevant tags drawn from the content domain.
- Each question must be grounded in the provided content.

Output must match the provided JSON schema exactly.`;
};

/**
 * Validates and transforms raw question objects from the Gemini response
 * into Mongoose-compatible question documents. Drops unparsable or corrupt
 * blocks and normalises field names (questionText -> text, Multiple-Choice -> MCQ).
 *
 * @param {any[]} questions              — Raw question objects from the LLM.
 * @param {string} requestedDifficulty   — Target difficulty level.
 * @returns {object[]} Valid Mongoose-compatible question objects.
 */
export const transformAndValidateHFQuestions = (questions, requestedDifficulty) => {
  if (!Array.isArray(questions)) return [];

  const validated = [];
  for (const q of questions) {
    if (!q || typeof q !== "object") continue;

    try {
      let type = q.type;
      if (type === "Multiple-Choice") {
        type = "MCQ";
      }
      if (!["MCQ", "True-False", "Short-Answer"].includes(type)) {
        type = "MCQ";
      }

      const text = String(q.questionText || q.text || q.question || "").trim();
      if (!text) continue;

      let options = Array.isArray(q.options) ? q.options.map(o => String(o).trim()) : [];
      if (type === "MCQ") {
        if (options.length < 2) continue;
      } else if (type === "True-False") {
        options = ["True", "False"];
      } else if (type === "Short-Answer") {
        options = [];
      }

      const correctAnswer = String(q.correctAnswer || q.answer || "").trim();
      if (!correctAnswer) continue;

      if (type === "MCQ" && !options.includes(correctAnswer)) {
        continue;
      } else if (type === "True-False" && !options.includes(correctAnswer)) {
        continue;
      }

      const difficulty = String(q.difficulty || requestedDifficulty || "medium").toLowerCase();
      if (!["easy", "medium", "hard"].includes(difficulty)) continue;

      const tags = Array.isArray(q.tags)
        ? q.tags.map(t => String(t).trim()).filter(Boolean)
        : ["AI Generated", "Gemini"];

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

  return validated;
};

/**
 * Generates a full quiz profile from a topic or document text using
 * Google Gemini 2.5 Flash with structured schema enforcement.
 *
 * @param {string} topic         — The target topic/prompt or document text.
 * @param {number} questionCount — Number of questions to generate.
 * @param {string} difficulty    — Target difficulty: "easy" | "medium" | "hard".
 * @param {boolean} isDocumentText — Whether the topic is actually a grounded course text.
 * @returns {Promise<{ title: string, description: string, tags: string[], questions: object[] }>}
 */
export const generateQuizFromPrompt = async (topic, questionCount, difficulty, isDocumentText = false) => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set a valid Gemini API key in your environment.",
    );
  }

  const prompt = buildPrompt(topic, questionCount, difficulty, isDocumentText);

  let response;
  try {
    response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            tags: { type: "ARRAY", items: { type: "STRING" } },
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  type: { type: "STRING" },
                  questionText: { type: "STRING" },
                  difficulty: { type: "STRING" },
                  options: { type: "ARRAY", items: { type: "STRING" } },
                  correctAnswer: { type: "STRING" },
                },
                required: ["type", "questionText", "options", "correctAnswer", "difficulty"],
              },
            },
          },
          required: ["title", "description", "tags", "questions"],
        },
      },
    });
  } catch (geminiError) {
    console.error("[aiService] Gemini API call failed:", {
      message: geminiError.message,
      name: geminiError.name,
      status: geminiError.status,
    });
    throw new Error(`Gemini API error: ${geminiError.message || "Unknown error"}`);
  }

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Empty response returned from Gemini API.");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (parseError) {
    console.error("[aiService] Gemini returned unparseable JSON despite schema. Raw length:", rawText.length);
    throw new Error("Gemini response schema enforcement failed — invalid JSON returned.");
  }

  const title =
    typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim()
      : `Quiz on ${typeof topic === "string" ? topic.slice(0, 60) : "Generated Topic"}`;

  const description =
    typeof parsed.description === "string" && parsed.description.trim()
      ? parsed.description.trim()
      : "This quiz was generated from the provided source material.";

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map(t => String(t).trim()).filter(Boolean)
    : ["AI Generated", "Gemini"];

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

  const validatedQuestions = transformAndValidateHFQuestions(rawQuestions, difficulty);

  if (validatedQuestions.length === 0) {
    throw new Error("Gemini generated 0 valid questions. Consider adjusting the prompt or difficulty.");
  }

  return {
    title,
    description,
    tags,
    questions: validatedQuestions,
  };
};

/**
 * Generates quiz questions from course text using Google Gemini.
 * Returns a full quiz profile object.
 *
 * @param {object} params
 * @param {string} params.text         — Raw extracted text from uploaded documents.
 * @param {number} params.numQuestions — Number of questions to generate.
 * @param {string} params.difficulty   — Target difficulty: "easy" | "medium" | "hard".
 * @returns {Promise<{ title: string, description: string, tags: string[], questions: object[] }>}
 */
export const generateQuestions = async ({ text, numQuestions, difficulty }) => {
  return generateQuizFromPrompt(text, numQuestions, difficulty, true);
};

// Dummy exports for backward compatibility and testing
export const getOpenAIClient = () => null;
