import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, changePassword, forgotPassword, resetPassword, verifyEmail, googleAuth, resendVerification } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many login attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, message: "Too many password reset requests. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many reset attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/verify-email/:token", verifyEmail);
router.post("/google", googleLimiter, googleAuth);
router.put("/password", authenticateToken, changePassword);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many resend attempts. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/resend-verification", resendLimiter, resendVerification);
router.post("/reset-password/:token", resetPasswordLimiter, resetPassword);

export default router;
