import { Router } from "express";
import { createQuiz, getQuizById } from "../controllers/quizController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

// POST /api/quizzes  — professor only
router.post("/", authenticateToken, requireRole("professor"), createQuiz);

// GET /api/quizzes/:id  — any authenticated user
router.get("/:id", authenticateToken, getQuizById);

export default router;
