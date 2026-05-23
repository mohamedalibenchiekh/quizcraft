import { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { generateQuestions } from "../services/aiService.js";

const router = Router();

// ─── Allowed difficulty values ──────────────────────────
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

// ─── POST /api/ai/generate — AI quiz generation ────────
router.post(
  "/generate",
  authenticateToken,
  requireRole("professor"),
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
