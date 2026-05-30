import { GoogleGenAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are an expert academic examiner and quiz generation engine for the QuizCraft educational platform.

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
 * Get or initialize the Gemini client lazily.
 * @returns {GoogleGenAI} The Gemini client instance
 */
const getGeminiClient = () => {
    return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });
};

/**
 * Processes Gemini raw output questions: drops unparsable/corrupt question blocks,
 * normalizes structure, maps fields to conform with the Mongoose schema (questionText -> text, Multiple-Choice -> MCQ),
 * and drops into an atomic fallback if all blocks are unparsable.
 *
 * @param {any[]} questions
 * @param {string} requestedDifficulty
 * @returns {object[]} Valid Mongoose-compatible question objects
 */
export const transformAndValidateGeminiQuestions = (questions, requestedDifficulty) => {
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
            tags: ["AI Fallback", "Gemini"],
        });
    }

    return validated;
};

/**
 * Generates quiz questions on a given topic using the Gemini API.
 *
 * @param {string} topic         — The target topic/prompt.
 * @param {number} questionCount — Number of questions to generate.
 * @param {string} difficulty    — Target difficulty: "easy" | "medium" | "hard".
 * @returns {Promise<object[]>} Array of question objects matching the Mongoose schema.
 */
export const generateQuizFromPrompt = async (topic, questionCount, difficulty) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }

    const ai = getGeminiClient();
    const userPrompt = `Generate exactly ${questionCount} quiz questions at "${difficulty}" difficulty level on the topic: "${topic}".`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: userPrompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            temperature: 0.4,
        },
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
        }
    });

    const content = response.text || (response.candidates && response.candidates[0]?.content?.parts[0]?.text);
    if (!content) {
        throw new Error("Empty response returned from Gemini API.");
    }

    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch (parseError) {
        parsed = { questions: [] };
    }

    const rawQuestions = parsed && Array.isArray(parsed.questions) ? parsed.questions : [];
    return transformAndValidateGeminiQuestions(rawQuestions, difficulty);
};

export { getGeminiClient, SYSTEM_PROMPT };
