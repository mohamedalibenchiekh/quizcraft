import { Router } from "express";
import { getProfessorAnalytics } from "../controllers/analyticsController.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /api/analytics/professor/:quizId -> Fetch aggregated statistical analytics for a specific quiz
router.get(
    "/professor/:quizId",
    authenticateToken,
    requireRole("professor"),
    getProfessorAnalytics
);

export default router;
