/**
 * @desc    Start a new live session for a quiz
 * @route   POST /api/sessions/start
 * @status  501 — Not implemented (Phase 3: Socket.io)
 */
export const startSession = async (req, res, next) => {
  try {
    res.status(501).json({
      success: false,
      message: "Session management is not yet implemented. Coming in Phase 3 (Socket.io).",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit an answer to the current question in a session
 * @route   POST /api/sessions/answer
 * @status  501 — Not implemented (Phase 3: Socket.io)
 */
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
