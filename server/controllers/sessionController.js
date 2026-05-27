import crypto from "crypto";
import mongoose from "mongoose";
import Session from "../models/Session.js";

const PIN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const PIN_LENGTH = 6;

const generatePin = () => {
  let pin = "";
  for (let i = 0; i < PIN_LENGTH; i++) {
    pin += PIN_CHARS[crypto.randomInt(0, PIN_CHARS.length)];
  }
  return pin;
};

const generateUniquePin = async () => {
  let pin;
  do {
    pin = generatePin();
  } while (await Session.exists({ pin }));
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

    const pin = await generateUniquePin();

    const session = await Session.create({
      quizId,
      hostId: req.user.id,
      pin,
    });

    res.status(201).json({
      success: true,
      data: session,
    });
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
