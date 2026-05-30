import { InferenceClient } from "@huggingface/inference";

const MAX_WORDS = 4000;
const HF_REQUEST_TIMEOUT_MS = 120_000; // 2 minutes

/**
 * Safely truncates text to a maximum word count to protect serverless token limits.
 * Appends a truncation notice if the text was cut.
 *
 * @param {string} text     — The source text to truncate.
 * @param {number} maxWords — Maximum number of words allowed (default: 4000).
 * @returns {string} Truncated text, or the original if within limits.
 */
export const truncateText = (text, maxWords = MAX_WORDS) => {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "\n\n[Content truncated...]";
};

/**
 * Builds a dynamic system prompt for the Hugging Face inference model.
 * Injects the requested question count and difficulty level so the LLM
 * generates exactly the right number of questions at the right difficulty.
 *
 * @param {number} questionCount — Number of questions the model must produce.
 * @param {string} difficulty    — Target difficulty: "easy" | "medium" | "hard".
 * @returns {string} The system prompt string.
 */
export const buildSystemPrompt = (questionCount, difficulty) => `You are an expert curriculum builder. Analyze the provided source document text and generate a complete quiz profile based exactly on the requested parameter matrix: Count = ${questionCount}, Difficulty = ${difficulty}.

STRICT OUTPUT RULES:
1. Return ONLY a raw JSON object — no markdown, no code fences (no \`\`\`json), no preamble, no postscript.
2. The JSON MUST match this schema exactly:
{
  "title": "A highly descriptive, customized name based on the document topic",
  "description": "A comprehensive 2-sentence summary outlining the learning objectives of this generated assessment.",
  "tags": ["TopicName", "Subcategory", "Difficulty"],
  "questions": [
    {
      "type": "Multiple-Choice",
      "questionText": "...",
      "difficulty": "${difficulty}",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A"
    }
  ]
}

3. For each question in the "questions" array:
   - "type" must be one of: "Multiple-Choice", "True-False", or "Short-Answer"
   - "questionText" is the clear, academic question statement
   - "difficulty" must be exactly "${difficulty}"
   - For "Multiple-Choice": "options" must have EXACTLY 4 distinct plausible options; "correctAnswer" must match one of the options
   - For "True-False": "options" must be ["True", "False"]; "correctAnswer" must be exactly "True" or "False"
   - For "Short-Answer": "options" must be []; "correctAnswer" is a definitive grading keyword or phrase

4. QUALITY REQUIREMENTS:
   - Questions must be directly grounded in the provided document text
   - Distractors for Multiple-Choice must be plausible but clearly incorrect
   - "title" must be specific to the document topic, NOT generic (e.g. "Quiz on Cellular Biology", not "Quiz")
   - "description" must be exactly 2 sentences covering what this quiz assesses
   - "tags" must contain at least 3 relevant keywords drawn from the document domain`;

/**
 * Get or initialize the Hugging Face client lazily.
 * @returns {InferenceClient} The Hugging Face client instance
 */
const getHFClient = () => {
  return new InferenceClient(process.env.HF_TOKEN, {
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(HF_REQUEST_TIMEOUT_MS),
      });
    },
  });
};

/**
 * Projects a default quiz profile structure with a single fallback question.
 * Used when every question block is unparsable or the LLM returns garbage.
 *
 * @param {string} difficulty — The requested difficulty level.
 * @returns {{ title: string, description: string, tags: string[], questions: object[] }}
 */
const buildFallbackQuizProfile = (difficulty) => {
  const normalizedDifficulty = ["easy", "medium", "hard"].includes(difficulty)
    ? difficulty
    : "medium";

  return {
    title: "Auto-generated Quiz (Parser Fallback)",
    description:
      "This quiz was generated as a fallback because the AI output could not be parsed correctly. Please review the content and regenerate if needed.",
    tags: ["AI Fallback", "Auto-generated", normalizedDifficulty],
    questions: [
      {
        text: "Placeholder question generated due to automatic parser fallback.",
        type: "True-False",
        options: ["True", "False"],
        correctAnswer: "True",
        difficulty: normalizedDifficulty,
        tags: ["AI Fallback", "Hugging Face"],
      },
    ],
  };
};

/**
 * Processes Hugging Face raw output questions: drops unparsable/corrupt question blocks,
 * normalizes structure, maps fields to conform with the Mongoose schema (questionText -> text, Multiple-Choice -> MCQ),
 * and returns the validated array (may be empty).
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

  return validated;
};

/**
 * Generates quiz questions on a given topic using the Hugging Face Serverless Inference API.
 * Returns a full quiz profile object including title, description, tags, and questions.
 *
 * @param {string} topic         — The target topic/prompt or document text.
 * @param {number} questionCount — Number of questions to generate.
 * @param {string} difficulty    — Target difficulty: "easy" | "medium" | "hard".
 * @param {boolean} isDocumentText — Whether the topic is actually a grounded course text.
 * @returns {Promise<{ title: string, description: string, tags: string[], questions: object[] }>}
 */
export const generateQuizFromPrompt = async (topic, questionCount, difficulty, isDocumentText = false) => {
  if (!process.env.HF_TOKEN || process.env.HF_TOKEN === "hf_your_actual_token_here") {
    throw new Error("HF_TOKEN is not configured. Please set a valid Hugging Face Token in your environment.");
  }

  const client = getHFClient();

  // --- Block 1: Context size defense — truncate document text if it is too large ---
  const sourceText = isDocumentText ? truncateText(topic) : topic;

  const userPrompt = isDocumentText
    ? `Generate exactly ${questionCount} quiz questions at "${difficulty}" difficulty level strictly grounded in the following course material:\n\n---\n${sourceText}\n---`
    : `Generate exactly ${questionCount} quiz questions at "${difficulty}" difficulty level on the topic: "${topic}".`;

  let chatCompletion;
  try {
    // Dynamic output tokens: ~200 tokens per question + buffer, capped at 4096
    const dynamicMaxTokens = Math.min(1024 + questionCount * 256, 4096);

    chatCompletion = await client.chatCompletion({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        { role: "system", content: buildSystemPrompt(questionCount, difficulty) },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: dynamicMaxTokens,
    });
  } catch (hfError) {
    console.error("[aiService] Hugging Face API call failed:", {
      message: hfError.message,
      name: hfError.name,
      statusCode: hfError.statusCode,
      statusText: hfError.statusText,
    });
    if (hfError.name === "AbortError") {
      throw new Error(
        "Hugging Face Inference API request timed out after " +
          (HF_REQUEST_TIMEOUT_MS / 1000) +
          "s. The serverless endpoint may be overloaded or the input text is too large. Try reducing the question count or text length.",
      );
    }
    if (hfError.message && hfError.message.includes("fetch failed")) {
      throw new Error(
        "Failed to reach the Hugging Face Inference API — check your network connectivity and that HF_TOKEN is valid.",
      );
    }
    if (hfError.statusCode) {
      throw new Error(
        `Hugging Face Inference API returned HTTP ${hfError.statusCode}${hfError.statusText ? ": " + hfError.statusText : ""}: ${hfError.message || "Unknown error"}`,
      );
    }
    throw new Error(
      `Hugging Face Inference API error: ${hfError.message || "Unknown error"}`,
    );
  }

  const content = chatCompletion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response returned from Hugging Face Inference API.");
  }

  // --- Block 3: Defensive parsing — strip markdown fences if present ---
  let cleanText = content.trim();
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\s*/, "").replace(/```$/, "").trim();
  }

  let parsed;
  try {
    parsed = JSON.parse(cleanText);
  } catch (parseError) {
    return buildFallbackQuizProfile(difficulty);
  }

  // --- Extract full profile from parsed response ---
  const title = typeof parsed.title === "string" && parsed.title.trim()
    ? parsed.title.trim()
    : `Quiz on ${typeof topic === "string" ? topic.slice(0, 60) : "Generated Topic"}`;

  const description = typeof parsed.description === "string" && parsed.description.trim()
    ? parsed.description.trim()
    : "This quiz was generated from the provided source material.";

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map(t => String(t).trim()).filter(Boolean)
    : ["AI Generated", "Hugging Face"];

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

  // --- Execute the map to response payload ---
  const validatedQuestions = transformAndValidateHFQuestions(rawQuestions, difficulty);

  if (validatedQuestions.length === 0) {
    return buildFallbackQuizProfile(difficulty);
  }

  return {
    title,
    description,
    tags,
    questions: validatedQuestions,
  };
};

/**
 * Generates quiz questions from course text using the Hugging Face Serverless Inference API.
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
