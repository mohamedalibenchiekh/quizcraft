import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendVerificationEmail, sendResetEmail } from "../utils/sendEmail.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper function to generate JWT and response payload for a user
const generateAuthResponse = (user) => {
  const token = jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return {
    success: true,
    token,
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Please provide a valid name" });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, message: "Please provide a valid email" });
    }

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
    }

    if (role && !["professor", "student"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be either 'professor' or 'student'" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await User.create({
      name: name.trim(),
      email: email.trim(),
      password: hashedPassword,
      role: role || "student",
      isVerified: false,
      verificationToken: tokenHash,
      verificationTokenExpires: Date.now() + 86400000,
    });

    try {
      await sendVerificationEmail(user.email, rawToken);
    } catch (emailError) {
      await User.findByIdAndDelete(user._id);
      console.error(`[REGISTER] Failed to send verification email to ${email}:`, emailError);
      return res.status(500).json({ success: false, message: "Registration failed. Could not send verification email. Please try again later." });
    }

    res.status(201).json({
      success: true,
      message: "Registration successful! Please check your email to verify your account.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.isVerified === false) {
      return res.status(401).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Your email has not been verified yet. Please check your inbox.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      verificationToken: tokenHash,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Verification link is invalid or has expired.",
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: "Google credential is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ success: false, message: "Google OAuth is not configured on the server" });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });

    // Scenario A: User exists - proceed with login
    if (user) {
      user.googleId = user.googleId || googleId;
      user.isVerified = true;
      await user.save();
      return res.status(200).json(generateAuthResponse(user));
    }

    // Scenario B: New user AND no role provided - request role selection
    if (!role) {
      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: "Role selection required for registration.",
      });
    }

    // Scenario C: New user AND role provided - create account
    if (role && !["professor", "student"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be either 'professor' or 'student'" });
    }

    user = await User.create({
      name,
      email,
      password: "GOOGLE_OAUTH",
      role: role,
      googleId,
      isVerified: true,
    });

    res.status(200).json(generateAuthResponse(user));
  } catch (error) {
    if (error.message?.includes("Token used too late") || error.message?.includes("Invalid token")) {
      return res.status(401).json({ success: false, message: "Invalid or expired Google credential" });
    }
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: "If an account exists, a reset link has been dispatched" });
    }
    const token = crypto.randomBytes(20).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();
    await sendResetEmail(user.email, token);
    res.json({ success: true, message: "If an account exists, a reset link has been dispatched" });
  } catch (error) {
    next(error);
  }
};

export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      return res.json({ success: true, message: "If an account exists with this email, a new verification link has been sent." });
    }

    if (user.isVerified === true) {
      return res.json({ success: true, message: "If an account exists with this email, a new verification link has been sent." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.verificationToken = tokenHash;
    user.verificationTokenExpires = Date.now() + 86400000;
    await user.save();

    await sendVerificationEmail(user.email, rawToken);

    res.json({ success: true, message: "If an account exists with this email, a new verification link has been sent." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ success: false, message: "Password reset token is invalid or has expired." });
    }
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ success: true, message: "Password has been reset successfully." });
  } catch (error) {
    next(error);
  }
};
