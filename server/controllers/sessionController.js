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

    await Session.createCollection();
    
    for (let attempt = 0; attempt < MAX_PIN_RETRIES; attempt++) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Clean up any stale sessions for this quiz+host before creating a new one
        await Session.updateMany(
          { quizId, hostId: req.user.id, status: { $in: ["waiting", "active"] } },
          { $set: { status: "completed" } },
          { session }
        );

        const pin = generatePin();
        const existing = await Session.findOne({ pin }, null, { session });
        if (existing) {
          await session.abortTransaction();
          session.endSession();
          continue;
        }

        const newSessionData = {
          quizId,
          hostId: req.user.id,
          pin
        };

        const created = await Session.create([newSessionData], { session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
          success: true,
          data: created[0],
        });
      } catch (transactionError) {
        if (session.inTransaction()) {
          await session.abortTransaction();
        }
        session.endSession();

        if (transactionError.code === 11000) {
          continue;
        }
        throw transactionError;
      }
    }

    throw new Error("Failed to generate a unique session PIN after multiple attempts.");

  } catch (error) {
    console.error("startSession error:", error);
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
