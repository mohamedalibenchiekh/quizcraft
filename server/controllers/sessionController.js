/**
 * @desc    Start a new live session for a quiz
 * @route   POST /api/sessions/start
 */
export const startSession = async (req, res, next) => {
  try {
    // Stubbed response
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    res.status(201).json({
      success: true,
      message: "Session started (stub)",
      data: {
        _id: "64f1a2b3c4d5e6f7a8b9c0e1",
        roomCode,
        quizId: req.body.quizId || "quiz_placeholder",
        status: "active",
        currentQuestionIndex: 0,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit an answer to the current question in a session
 * @route   POST /api/sessions/answer
 */
export const submitAnswer = async (req, res, next) => {
  try {
    // Stubbed response
    res.status(200).json({
      success: true,
      message: "Answer submitted (stub)",
      data: {
        sessionId: req.body.sessionId || "session_placeholder",
        questionIndex: req.body.questionIndex ?? 0,
        selectedAnswer: req.body.answer || "N/A",
        isCorrect: true, // mock — always correct for now
      },
    });
  } catch (error) {
    next(error);
  }
};
