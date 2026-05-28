import crypto from "crypto";
import mongoose from "mongoose";
import Session from "../models/Session.js";
import Quiz from "../models/Quiz.js";

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

const createSessionWithUniquePin = async (data) => {
  for (let attempt = 0; attempt < MAX_PIN_RETRIES; attempt++) {
    data.pin = generatePin();
    try {
      return await Session.create(data);
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

    const quiz = await Quiz.findById(quizId).populate("questions");
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found.",
      });
    }

    if (quiz.professorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — you do not own this quiz.",
      });
    }

    const totalQuestions = quiz.questions?.length || 0;

    const session = await createSessionWithUniquePin({
      quizId,
      hostId: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: {
        ...session.toObject(),
        totalQuestions,
        quiz,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Validation Error: session ID must be a valid MongoDB ObjectId.",
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    if (session.hostId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden — you do not own this session.",
      });
    }

    if (session.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Session is already completed.",
      });
    }

    session.status = "completed";
    await session.save();

    res.status(200).json({
      success: true,
      message: "Session cancelled successfully.",
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
