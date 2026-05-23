import "dotenv/config"; // loads .env automatically
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import errorHandler from "./middleware/errorHandler.js";

// ─── Route modules ──────────────────────────────────────
import authRoutes from "./routes/auth.js";
import quizRoutes from "./routes/quizzes.js";
import sessionRoutes from "./routes/sessions.js";
import uploadRoutes from "./routes/upload.js";
import aiRoutes from "./routes/ai.js";

// ─── Initialise app ─────────────────────────────────────
const app = express();

// ─── Global middleware ───────────────────────────────────
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
  res.json({ status: "ok", uptime: process.uptime() });
});

// ─── Global error handler (must be LAST middleware) ──────
app.use(errorHandler);

export default app;
