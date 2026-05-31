import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { getProfileStats } from "../controllers/userController.js";

const router = Router();

// GET /api/users/profile/stats -> Role-specific profile statistics
router.get("/profile/stats", authenticateToken, getProfileStats);

export default router;
