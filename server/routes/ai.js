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
      const { text, numQuestions, difficulty } = req.body;

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

      // ── AI generation ───────────────────────────────────
      const questions = await generateQuestions({
        text: text.trim(),
        numQuestions: parsedNum,
        difficulty,
      });

      res.status(200).json({
        success: true,
        questions,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
