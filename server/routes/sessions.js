import { Router } from "express";
import { startSession, cancelSession, submitAnswer } from "../controllers/sessionController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

// POST /api/sessions/start  — professor starts a live session
router.post("/start", authenticateToken, requireRole("professor"), startSession);

// PATCH /api/sessions/:id/cancel  — professor cancels an active/waiting session
router.patch("/:id/cancel", authenticateToken, requireRole("professor"), cancelSession);

// POST /api/sessions/answer  — any authenticated user submits an answer
router.post("/answer", authenticateToken, submitAnswer);

export default router;
