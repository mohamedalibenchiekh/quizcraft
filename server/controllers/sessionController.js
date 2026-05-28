import crypto from "crypto";
import mongoose from "mongoose";
import Session from "../models/Session.js";

const PIN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const PIN_LENGTH = 6;
const MAX_PIN_RETRIES = 5;

const generatePin = () => {
  let pin = "";
  for (let i = 0; i < PIN_LENGTH; i++) {
    pin += PIN_CHARS[crypto.randomInt(0, PIN_CHARS.length)];
  }
  return pin;
};

const createSessionWithUniquePin = async (data, opts = {}) => {
  for (let attempt = 0; attempt < MAX_PIN_RETRIES; attempt++) {
    data.pin = generatePin();
    try {
      const created = await Session.create([data], opts);
      return created[0];
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  throw new Error("Failed to generate a unique session PIN after multiple attempts.");
};

export const startSession = async (req, res, next) => {
  try {
    const { quizId } = req.body;

    if (!quizId) {
      return res.status(400).json({
        success: false,
        message: "Validation Error: 'quizId' is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({
        success: false,
        message: "Validation Error: 'quizId' must be a valid MongoDB ObjectId.",
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Clean up any stale sessions for this quiz+host before creating a new one
      await Session.updateMany(
        { quizId, hostId: req.user.id, status: { $in: ["waiting", "active"] } },
        { $set: { status: "completed" } },
        { session }
      );

      const newSession = await createSessionWithUniquePin({
        quizId,
        hostId: req.user.id,
      }, { session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        success: true,
        data: newSession,
      });
    } catch (transactionError) {
      await session.abortTransaction();
      session.endSession();
      throw transactionError;
    }
  } catch (error) {
    next(error);
  }
};

export const submitAnswer = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "Answer submission is not yet implemented. Coming in Phase 3 (Socket.io).",
    });
  } catch (error) {
    next(error);
  }
};
