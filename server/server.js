import app from "./app.js";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// ─── Start server ────────────────────────────────────────
const start = async () => {
  await connectDB();
  const server = app.listen(PORT, () => {
    console.log(`🚀  QuizCraft API running on http://localhost:${PORT}`);
  });

  // ─── Graceful shutdown handlers ──────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n⚠️   Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log("🛑  HTTP server closed.");
      try {
        await mongoose.connection.close();
        console.log("🔌  MongoDB connection closed.");
        process.exit(0);
      } catch (dbErr) {
        console.error("⚠️  Error closing DB connection:", dbErr.message);
        process.exit(1);
      }
    });

    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error("⏱  Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start();
