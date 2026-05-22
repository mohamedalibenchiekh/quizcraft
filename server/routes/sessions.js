import { Router } from "express";
import { startSession, submitAnswer } from "../controllers/sessionController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

// POST /api/sessions/start  — professor starts a live session
router.post("/start", authenticateToken, requireRole("professor"), startSession);

// POST /api/sessions/answer  — any authenticated user submits an answer
router.post("/answer", authenticateToken, submitAnswer);

export default router;
