import { Router } from "express";
import { startSession, submitAnswer } from "../controllers/sessionController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

// POST /api/sessions/start  — professor starts a session
router.post("/start", protect, requireRole("professor"), startSession);

// POST /api/sessions/answer  — any authenticated user submits an answer
router.post("/answer", protect, submitAnswer);

export default router;
