import { Router } from "express";
import { createQuiz, getQuizById } from "../controllers/quizController.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = Router();

// POST /api/quizzes  — professor only
router.post("/", protect, requireRole("professor"), createQuiz);

// GET /api/quizzes/:id
router.get("/:id", protect, getQuizById);

export default router;
