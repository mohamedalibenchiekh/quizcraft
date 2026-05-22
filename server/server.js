import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// ─── Start server ────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀  QuizCraft API running on http://localhost:${PORT}`);
  });
};

start();
