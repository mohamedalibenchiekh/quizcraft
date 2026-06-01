import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { generateQuestions } from "../services/aiService.js";

const router = Router();

// ─── Allowed difficulty values ──────────────────────────
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const MAX_TEXT_LENGTH = 50000;

// Rate limit: max 20 AI generation requests per hour per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many AI generation requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── POST /api/ai/generate — AI quiz generation ────────
router.post(
  "/generate",
  authenticateToken,
  requireRole("professor"),
  aiLimiter,
  async (req, res, next) => {
    try {
      const { text, numQuestions, difficulty, isAdvanced, matrix, customPrompt } = req.body;

      // ── Input validation ────────────────────────────────
      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Validation failed — 'text' is required and must be a non-empty string.",
        });
      }

      if (text.length > MAX_TEXT_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Validation failed — 'text' exceeds the maximum length of ${MAX_TEXT_LENGTH} characters.`,
        });
      }

      const parsedNum = Number(numQuestions);
      if (!Number.isInteger(parsedNum) || parsedNum < 1) {
        return res.status(400).json({
          success: false,
          message:
            "Validation failed — 'numQuestions' must be a positive integer.",
        });
      }

      if (!difficulty || !VALID_DIFFICULTIES.has(difficulty)) {
        return res.status(400).json({
          success: false,
          message:
            "Validation failed — 'difficulty' must be one of: easy, medium, hard.",
        });
      }

      // ── Custom prompt validation ────────────────────────
      const MAX_CUSTOM_PROMPT_LENGTH = 2000;
      if (customPrompt !== undefined && typeof customPrompt !== "string") {
        return res.status(400).json({
          success: false,
          message: "Validation failed — 'customPrompt' must be a string.",
        });
      }
      if (customPrompt && customPrompt.length > MAX_CUSTOM_PROMPT_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Validation failed — 'customPrompt' exceeds the maximum length of ${MAX_CUSTOM_PROMPT_LENGTH} characters.`,
        });
      }

      // ── Advanced matrix validation ──────────────────────
      if (isAdvanced) {
        if (!matrix || typeof matrix !== "object") {
          return res.status(400).json({
            success: false,
            message: "Validation failed — 'matrix' must be a valid object when advanced mode is enabled.",
          });
        }
        const types = ["MCQ", "True-False", "Short-Answer"];
        const diffs = ["easy", "medium", "hard"];
        for (const t of types) {
          if (!matrix[t] || typeof matrix[t] !== "object") {
            return res.status(400).json({
              success: false,
              message: `Validation failed — matrix missing question type '${t}'.`,
            });
          }
          for (const d of diffs) {
            if (typeof matrix[t][d] !== "number" || matrix[t][d] < 0 || !Number.isInteger(matrix[t][d])) {
              return res.status(400).json({
                success: false,
                message: `Validation failed — matrix[${t}][${d}] must be a non-negative integer.`,
              });
            }
          }
        }
      }

      // ── Route-level text length truncation ──────────────
      const sourceText = text.trim();
      const truncatedText = sourceText.length > MAX_TEXT_LENGTH
        ? sourceText.slice(0, MAX_TEXT_LENGTH)
        : sourceText;

      // ── AI generation ───────────────────────────────────
      const quizProfile = await generateQuestions({
        text: truncatedText,
        numQuestions: parsedNum,
        difficulty,
        isAdvanced: !!isAdvanced,
        matrix: isAdvanced ? matrix : null,
        customPrompt,
      });

      res.status(200).json({
        success: true,
        title: quizProfile.title,
        description: quizProfile.description,
        tags: quizProfile.tags,
        questions: quizProfile.questions,
        generatedCount: quizProfile.questions.length,
      });
    } catch (err) {
      console.error("[AI Route] Quiz generation failed:", err.message);
      res.status(500).json({
        success: false,
        message: "AI generation failed — unable to reach or process response from the Gemini API.",
      });
    }
  }
);

export default router;
