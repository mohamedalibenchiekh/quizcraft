import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, changePassword, forgotPassword, resetPassword } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// Rate limit: max 5 login attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit: max 10 registration attempts per hour per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit: max 3 forgot-password requests per 15 minutes per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many password reset requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit: max 10 reset-password attempts per 15 minutes per IP
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many reset attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post("/register", registerLimiter, register);

// POST /api/auth/login
router.post("/login", loginLimiter, login);

// PUT /api/auth/password -> Change the authenticated user's password
router.put("/password", authenticateToken, changePassword);

// POST /api/auth/forgot-password -> Send reset email with expiring token
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

// POST /api/auth/reset-password/:token -> Verify token & update password
router.post("/reset-password/:token", resetPasswordLimiter, resetPassword);

export default router;
