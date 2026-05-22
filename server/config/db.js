import mongoose from "mongoose";

/**
 * Establishes the MongoDB connection via Mongoose.
 * Reads MONGO_URI from the process environment.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
