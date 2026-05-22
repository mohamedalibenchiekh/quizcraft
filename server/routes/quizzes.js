import { Router } from "express";
import {
  createQuiz,
  getMyQuizzes,
  getQuizById,
  updateQuizMetadata,
  deleteQuiz,
  addQuestionToQuiz,
  updateQuestion,
  deleteQuestion,
} from "../controllers/quizController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

// POST /api/quizzes -> Create a new Quiz and its nested Question documents simultaneously.
router.post("/", authenticateToken, requireRole("professor"), createQuiz);

// GET /api/quizzes -> Fetch a list of all quizzes created by the logged-in professor.
router.get("/", authenticateToken, requireRole("professor"), getMyQuizzes);

// GET /api/quizzes/:id -> Fetch a single quiz populated with its complete array of detailed question documents.
router.get("/:id", authenticateToken, getQuizById);

// PUT /api/quizzes/:id -> Modify high-level quiz metadata (title, description, isApproved status).
router.put("/:id", authenticateToken, requireRole("professor"), updateQuizMetadata);

// DELETE /api/quizzes/:id -> Permanently drop a quiz and trigger a cascading delete across its connected questions.
router.delete("/:id", authenticateToken, requireRole("professor"), deleteQuiz);

// POST /api/quizzes/:id/questions -> Manually create and push a new explicit question into an existing quiz.
router.post("/:id/questions", authenticateToken, requireRole("professor"), addQuestionToQuiz);

// PUT /api/quizzes/:quizId/questions/:questionId -> Modify the attributes of an explicit question inside a quiz.
router.put("/:quizId/questions/:questionId", authenticateToken, requireRole("professor"), updateQuestion);

// DELETE /api/quizzes/:quizId/questions/:questionId -> Remove an explicit question from a quiz array and drop it from the Question collection completely.
router.delete("/:quizId/questions/:questionId", authenticateToken, requireRole("professor"), deleteQuestion);

export default router;
