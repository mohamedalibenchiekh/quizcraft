import { Router } from "express";
import rateLimit from "express-rate-limit";
import { startSession, cancelSession, submitAnswer, verifySession } from "../controllers/sessionController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many verification attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/sessions/start  — professor starts a live session
router.post("/start", authenticateToken, requireRole("professor"), startSession);

// PATCH /api/sessions/:id/cancel  — professor cancels an active/waiting session
router.patch("/:id/cancel", authenticateToken, requireRole("professor"), cancelSession);

// POST /api/sessions/verify  — validate a session PIN (public, no auth required)
router.post("/verify", verifyLimiter, verifySession);

// POST /api/sessions/answer  — any authenticated user submits an answer
router.post("/answer", authenticateToken, submitAnswer);

export default router;
