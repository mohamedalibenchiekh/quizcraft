import "dotenv/config"; // loads .env automatically
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";

import errorHandler from "./middleware/errorHandler.js";

// ─── Route modules ──────────────────────────────────────
import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quizzes.js";
import sessionRoutes from "./routes/sessions.js";
import uploadRoutes from "./routes/upload.js";
import aiRoutes from "./routes/ai.js";
import attemptRoutes from "./routes/attempts.js";

// ─── Initialise app ─────────────────────────────────────
const app = express();

// ─── Global middleware ───────────────────────────────────
// Number of trusted reverse-proxy hops so express-rate-limit identifies real client IPs.
// Set TRUST_PROXY=0 for direct-facing deployments, or higher values for multi-hop
// topologies (e.g. Cloudflare → Nginx → app requires 2).
const trustProxy = process.env.TRUST_PROXY;
app.set("trust proxy", trustProxy !== undefined ? Number(trustProxy) : 1);
app.use(express.json()); // parse JSON bodies
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled since this is a pure JSON API and doesn't serve HTML
  })
); // secure HTTP headers
app.use(morgan("dev")); // request logging
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ─── API routes ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/attempts", attemptRoutes);

// ─── Root endpoint ───────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Welcome to the QuizCraft API Platform",
    endpoints: {
      health: "/api/health",
      upload: "/api/upload",
      ai: "/api/ai",
      auth: "/api/auth",
      quizzes: "/api/quizzes",
      sessions: "/api/sessions",
    },
  });
});

// ─── Health-check endpoint ───────────────────────────────
app.get("/api/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  if (dbState !== 1) {
    return res.status(503).json({
      status: "unavailable",
      uptime: process.uptime(),
      database: dbStatus[dbState] || "unknown",
    });
  }
  res.json({ status: "ok", uptime: process.uptime(), database: "connected" });
});

// ─── Global error handler (must be LAST middleware) ──────
app.use(errorHandler);

export default app;
