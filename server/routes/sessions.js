import { Router } from "express";
import { startSession, cancelSession, submitAnswer, verifySession } from "../controllers/sessionController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

// POST /api/sessions/start  — professor starts a live session
router.post("/start", authenticateToken, requireRole("professor"), startSession);

// PATCH /api/sessions/:id/cancel  — professor cancels an active/waiting session
router.patch("/:id/cancel", authenticateToken, requireRole("professor"), cancelSession);

// POST /api/sessions/verify  — validate a session PIN (public, no auth required)
router.post("/verify", verifySession);

// POST /api/sessions/answer  — any authenticated user submits an answer
router.post("/answer", authenticateToken, submitAnswer);

export default router;
