import mongoose from "mongoose";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";
import Session from "../models/Session.js";

const VALID_TYPES = ['MCQ', 'True-False', 'Short-Answer'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

const validateQuestionData = (q) => {
  if (!q.text || !q.text.trim()) {
    return { error: "Question text is required" };
  }
  if (!q.type || !VALID_TYPES.includes(q.type)) {
    return { error: "Invalid question type" };
  }
  if (!q.correctAnswer || !q.correctAnswer.trim()) {
    return { error: "Correct answer is required" };
  }
  if (!q.difficulty || !VALID_DIFFICULTIES.includes(q.difficulty)) {
    return { error: "Difficulty must be easy, medium, or hard" };
  }

  let formattedOptions = [];
  if (q.type === 'MCQ') {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return { error: "MCQ questions must have at least 2 options" };
    }
    formattedOptions = q.options.map(o => typeof o === 'string' ? o.trim() : o).filter(Boolean);
    if (formattedOptions.length < 2) {
      return { error: "MCQ questions must have at least 2 options" };
    }
    if (!formattedOptions.includes(q.correctAnswer.trim())) {
      return { error: "Correct answer must match one of the MCQ options" };
    }
  } else if (q.type === 'True-False') {
    formattedOptions = ['True', 'False'];
    if (q.correctAnswer !== 'True' && q.correctAnswer !== 'False') {
      return { error: "True-False correctAnswer must be 'True' or 'False'" };
    }
  }

  return {
    sanitized: {
      text: q.text.trim(),
      type: q.type,
      options: formattedOptions,
      correctAnswer: q.correctAnswer.trim(),
      difficulty: q.difficulty,
      tags: Array.isArray(q.tags) ? q.tags.map(t => typeof t === 'string' ? t.trim() : t).filter(Boolean) : []
    }
  };
};

/**
 * @desc    Create a new quiz (professor only)
 * @route   POST /api/quizzes
 */
export const createQuiz = async (req, res, next) => {
  try {
    const { title, description, questions, isApproved } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Quiz title is required" });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "At least one question is required" });
    }

    const sanitizedQuestions = [];

    // Validate and normalize all questions before writing any documents.
    for (const q of questions) {
      const result = validateQuestionData(q);
      if (result.error) {
        return res.status(400).json({ success: false, message: result.error });
      }
      sanitizedQuestions.push(result.sanitized);
    }

    // Pre-create collections to avoid DDL execution within transactions (fixes WriteConflict/Namespace issues in memory replica sets)
    await Question.createCollection();
    await Quiz.createCollection();

    const session = await mongoose.startSession();
    session.startTransaction();
    let transactionCommitted = false;

    try {
      const questionIds = [];
      
      // Iterate through questions to save them individually and harvest their IDs
      for (const sq of sanitizedQuestions) {
        const newQuestion = new Question(sq);
        const savedQuestion = await newQuestion.save({ session });
        questionIds.push(savedQuestion._id);
      }

      const newQuiz = new Quiz({
        title: title.trim(),
        description: description ? description.trim() : "",
        professorId: req.user.id,
        questions: questionIds,
        isApproved: isApproved !== undefined ? isApproved : false
      });

      const savedQuiz = await newQuiz.save({ session });
      await session.commitTransaction();
      transactionCommitted = true;
      session.endSession();

      const populatedQuiz = await Quiz.findById(savedQuiz._id).populate('questions');

      res.status(201).json({
        success: true,
        message: "Quiz created successfully",
        data: populatedQuiz
      });
    } catch (transactionError) {
      if (!transactionCommitted) {
        await session.abortTransaction();
      }
      session.endSession();
      throw transactionError;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch all published quizzes (student-facing)
 * @route   GET /api/quizzes/published
 */
export const getPublishedQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ isApproved: true }).populate('questions');
    res.status(200).json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch a list of all quizzes created by the logged-in professor
 * @route   GET /api/quizzes
 */
export const getMyQuizzes = async (req, res, next) => {
  try {
    const query = { professorId: req.user.id };
    if (req.query.approved !== undefined) {
      query.isApproved = req.query.approved === "true";
    }
    const quizzes = await Quiz.find(query).populate('questions');
    res.status(200).json({
      success: true,
      data: quizzes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Fetch a single quiz populated with its complete array of detailed question documents
 * @route   GET /api/quizzes/:id
 */
export const getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('questions');
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }
    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Modify high-level quiz metadata (title, description, isApproved status)
 *          or perform a full quiz update including transactional question replacement
 * @route   PUT /api/quizzes/:id
 */
export const updateQuizMetadata = async (req, res, next) => {
  try {
    const { title, description, isApproved, questions } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    // Ownership check
    if (quiz.professorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden — You do not own this quiz" });
    }

    // If questions are provided, perform a transactional full replacement
    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, message: "At least one question is required" });
      }

      const sanitizedQuestions = [];

      for (const q of questions) {
        const result = validateQuestionData(q);
        if (result.error) {
          return res.status(400).json({ success: false, message: result.error });
        }
        sanitizedQuestions.push(result.sanitized);
      }

      await Question.createCollection();
      await Quiz.createCollection();

      const session = await mongoose.startSession();
      session.startTransaction();
      let transactionCommitted = false;

      try {
        // Block if the quiz owner has an active session using this quiz
        const activeSession = await Session.findOne({
          quizId: quiz._id,
          hostId: req.user.id,
          status: 'active',
        }).session(session);
        if (activeSession) {
          await session.abortTransaction();
          session.endSession();
          return res.status(409).json({
            success: false,
            message: "Cannot edit a quiz while a live session is in progress. End the session first.",
          });
        }

        // Delete old questions
        if (quiz.questions.length > 0) {
          await Question.deleteMany({ _id: { $in: quiz.questions } }, { session });
        }

        // Create new questions
        const newQuestionIds = [];
        for (const sq of sanitizedQuestions) {
          const newQuestion = new Question(sq);
          const savedQuestion = await newQuestion.save({ session });
          newQuestionIds.push(savedQuestion._id);
        }

        // Update quiz fields
        if (typeof title === 'string') quiz.title = title.trim();
        if (typeof description === 'string') quiz.description = description.trim();
        if (isApproved !== undefined) quiz.isApproved = isApproved;
        quiz.questions = newQuestionIds;

        await quiz.save({ session });
        await session.commitTransaction();
        transactionCommitted = true;
        session.endSession();

        const populated = await Quiz.findById(quiz._id).populate('questions');

        return res.status(200).json({
          success: true,
          message: "Quiz updated successfully",
          data: populated
        });
      } catch (transactionError) {
        if (!transactionCommitted) {
          await session.abortTransaction();
        }
        session.endSession();
        throw transactionError;
      }
    }

    // No questions — just update metadata
    if (typeof title === 'string') quiz.title = title.trim();
    if (typeof description === 'string') quiz.description = description.trim();
    if (isApproved !== undefined) quiz.isApproved = isApproved;

    const updatedQuiz = await quiz.save();
    const populated = await Quiz.findById(updatedQuiz._id).populate('questions');

    res.status(200).json({
      success: true,
      message: "Quiz metadata updated successfully",
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Permanently drop a quiz and trigger a cascading delete across its connected questions
 * @route   DELETE /api/quizzes/:id
 */
export const deleteQuiz = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const quiz = await Quiz.findById(req.params.id).session(session);
    if (!quiz) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    // Ownership check
    if (quiz.professorId.toString() !== req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: "Forbidden — You do not own this quiz" });
    }

    // Cascading delete within transaction
    if (quiz.questions && quiz.questions.length > 0) {
      await Question.deleteMany({ _id: { $in: quiz.questions } }, { session });
    }

    // Remove Quiz document
    await Quiz.deleteOne({ _id: quiz._id }, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Quiz and all connected questions successfully deleted"
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(error);
  }
};

/**
 * @desc    Manually create and push a new explicit question into an existing quiz
 * @route   POST /api/quizzes/:id/questions
 */
export const addQuestionToQuiz = async (req, res, next) => {
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const quiz = await Quiz.findById(req.params.id).session(session);
    if (!quiz) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    // Ownership check
    if (quiz.professorId.toString() !== req.user.id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ success: false, message: "Forbidden — You do not own this quiz" });
    }

    const { text, type, options, correctAnswer, difficulty, tags } = req.body;

    // Validate via shared helper
    const validationResult = validateQuestionData({ text, type, options, correctAnswer, difficulty, tags });
    if (validationResult.error) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: validationResult.error });
    }

    // Create the question document within the transaction
    const newQuestion = new Question(validationResult.sanitized);

    const savedQuestion = await newQuestion.save({ session });

    // Push into the quiz array and save within the same transaction
    quiz.questions.push(savedQuestion._id);
    await quiz.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Question successfully added to quiz",
      data: savedQuestion
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(error);
  }
};

/**
 * @desc    Modify the attributes of an explicit question inside a quiz
 * @route   PUT /api/quizzes/:quizId/questions/:questionId
 */
export const updateQuestion = async (req, res, next) => {
  try {
    const { quizId, questionId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    // Ownership check
    if (quiz.professorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden — You do not own this quiz" });
    }

    // Check if the question is in the quiz's array
    if (!quiz.questions.includes(questionId)) {
      return res.status(400).json({ success: false, message: "Question does not belong to this quiz" });
    }

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found" });
    }

    const { text, type, options, correctAnswer, difficulty, tags } = req.body;

    // Apply updates and run consistent validations
    if (text !== undefined) {
      if (!text.trim()) {
        return res.status(400).json({ success: false, message: "Question text cannot be empty" });
      }
      question.text = text.trim();
    }

    if (difficulty !== undefined) {
      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return res.status(400).json({ success: false, message: "Difficulty must be easy, medium, or hard" });
      }
      question.difficulty = difficulty;
    }

    if (tags !== undefined) {
      question.tags = Array.isArray(tags) ? tags.map(t => typeof t === 'string' ? t.trim() : t).filter(Boolean) : [];
    }

    // Capture the type that will be active
    const activeType = type !== undefined ? type : question.type;
    if (type !== undefined) {
      if (!['MCQ', 'True-False', 'Short-Answer'].includes(type)) {
        return res.status(400).json({ success: false, message: "Invalid question type" });
      }
      question.type = type;
    }

    if (activeType === 'MCQ') {
      if (options !== undefined) {
        if (!Array.isArray(options) || options.length < 2) {
          return res.status(400).json({ success: false, message: "MCQ questions must have at least 2 options" });
        }
        question.options = options.map(o => typeof o === 'string' ? o.trim() : o).filter(Boolean);
        if (question.options.length < 2) {
          return res.status(400).json({ success: false, message: "MCQ questions must have at least 2 options" });
        }
      }
      if (correctAnswer !== undefined) {
        question.correctAnswer = correctAnswer.trim();
      }
      // Assert consistency between options and correctAnswer
      if (!question.options.includes(question.correctAnswer)) {
        return res.status(400).json({ success: false, message: "Correct answer must match one of the MCQ options" });
      }
    } else if (activeType === 'True-False') {
      question.options = ['True', 'False'];
      if (correctAnswer !== undefined) {
        const ca = correctAnswer.trim();
        if (ca !== 'True' && ca !== 'False') {
          return res.status(400).json({ success: false, message: "True-False correctAnswer must be 'True' or 'False'" });
        }
        question.correctAnswer = ca;
      } else {
        // Check if existing correctAnswer is valid for True-False
        if (question.correctAnswer !== 'True' && question.correctAnswer !== 'False') {
          return res.status(400).json({ success: false, message: "Correct answer must be updated to 'True' or 'False'" });
        }
      }
    } else if (activeType === 'Short-Answer') {
      question.options = [];
      if (correctAnswer !== undefined) {
        if (!correctAnswer.trim()) {
          return res.status(400).json({ success: false, message: "Correct answer cannot be empty" });
        }
        question.correctAnswer = correctAnswer.trim();
      }
    }

    const updatedQuestion = await question.save();

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: updatedQuestion
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove an explicit question from a quiz array and drop it from the Question collection completely
 * @route   DELETE /api/quizzes/:quizId/questions/:questionId
 */
export const deleteQuestion = async (req, res, next) => {
  try {
    const { quizId, questionId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const quiz = await Quiz.findById(quizId).session(session);
      if (!quiz) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: "Quiz not found" });
      }

      // Ownership check
      if (quiz.professorId.toString() !== req.user.id) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ success: false, message: "Forbidden — You do not own this quiz" });
      }

      // Verify ownership/association
      if (!quiz.questions.includes(questionId)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "Question does not belong to this quiz" });
      }

      // Pull from Quiz's array of questions
      quiz.questions.pull(questionId);
      await quiz.save({ session });

      // Drop from collection
      await Question.deleteOne({ _id: questionId }, { session });

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        success: true,
        message: "Question deleted successfully and removed from quiz"
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

/**
 * @desc    Toggle quiz approval status (professor only)
 * @route   PATCH /api/quizzes/:id/approve
 */
export const toggleQuizApproval = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    // Ownership check
    if (quiz.professorId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden — You do not own this quiz" });
    }

    // Update isApproved to opposite, or to an explicitly passed value if provided
    const { isApproved } = req.body;
    if (isApproved !== undefined) {
      quiz.isApproved = isApproved === true || isApproved === 'true';
    } else {
      quiz.isApproved = !quiz.isApproved;
    }

    const updatedQuiz = await quiz.save();
    const populated = await Quiz.findById(updatedQuiz._id).populate('questions');

    res.status(200).json({
      success: true,
      message: `Quiz ${populated.isApproved ? "published" : "moved to draft"} successfully`,
      data: populated
    });
  } catch (error) {
    next(error);
  }
};
