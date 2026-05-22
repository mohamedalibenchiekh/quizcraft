/**
 * @desc    Create a new quiz (professor only)
 * @route   POST /api/quizzes
 */
export const createQuiz = async (req, res, next) => {
  try {
    // Stubbed response — will be wired to Quiz & Question models later
    res.status(201).json({
      success: true,
      message: "Quiz created (stub)",
      data: {
        _id: "64f1a2b3c4d5e6f7a8b9c0d1",
        title: req.body.title || "Untitled Quiz",
        professorId: req.user?.id || "professor_placeholder",
        questions: [],
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch a quiz by ID
 * @route   GET /api/quizzes/:id
 */
export const getQuizById = async (req, res, next) => {
  try {
    // Stubbed response
    res.status(200).json({
      success: true,
      data: {
        _id: req.params.id,
        title: "Sample Quiz",
        professorId: "64f1a2b3c4d5e6f7a8b9c0d2",
        questions: [
          {
            _id: "64f1a2b3c4d5e6f7a8b9c0d3",
            type: "MCQ",
            text: "What is the capital of France?",
            options: ["Berlin", "Madrid", "Paris", "Rome"],
            correctAnswer: "Paris",
            difficulty: "easy",
            tags: ["geography"],
          },
        ],
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
