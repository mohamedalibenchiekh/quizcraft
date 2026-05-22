import mongoose from "mongoose";

// ─── Connection Lifecycle Monitors ──────────────────────────────────────────
// These listeners are registered once at module load time.
// They remain active for the entire process lifetime, tracking every
// state transition on the shared Mongoose default connection.

mongoose.connection.on("connected", () => {
  console.log(
    "🔐  [DB] Secure tunnel to MongoDB Atlas is live — connection established."
  );
});

mongoose.connection.on("error", (err) => {
  console.error(`⚠️   [DB] Runtime database error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn(
    "🔌  [DB] WARNING — Database connection was dropped. Awaiting reconnect…"
  );
});

// ─── connectDB ───────────────────────────────────────────────────────────────
/**
 * Establishes the initial MongoDB connection via Mongoose.
 *
 * - Reads the connection string from `process.env.MONGO_URI`.
 * - On failure, logs a detailed error and exits the process so that the
 *   application never starts in a degraded state without a database.
 *
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    // The "connected" lifecycle listener above will fire immediately after
    // the connection is established, providing the success log.
  } catch (error) {
    console.error(
      `❌  [DB] Initial connection to MongoDB Atlas failed:\n    → ${error.message}`
    );
    process.exit(1); // Terminate gracefully — do not run without a DB.
  }
};
