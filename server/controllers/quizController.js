import mongoose from "mongoose";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

/**
 * @desc    Create a new quiz (professor only)
 * @route   POST /api/quizzes
 */
export const createQuiz = async (req, res, next) => {
  try {
    const { title, description, questions } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Quiz title is required" });
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "At least one question is required" });
    }

    const sanitizedQuestions = [];

    // Validate and normalize all questions before writing any documents.
    for (const q of questions) {
      if (!q.text || !q.text.trim()) {
        return res.status(400).json({ success: false, message: "Question text is required" });
      }
      if (!q.type || !['MCQ', 'True-False', 'Short-Answer'].includes(q.type)) {
        return res.status(400).json({ success: false, message: "Invalid question type" });
      }
      if (!q.correctAnswer || !q.correctAnswer.trim()) {
        return res.status(400).json({ success: false, message: "Correct answer is required" });
      }
      if (!q.difficulty || !['easy', 'medium', 'hard'].includes(q.difficulty)) {
        return res.status(400).json({ success: false, message: "Difficulty must be easy, medium, or hard" });
      }

      let formattedOptions = [];
      if (q.type === 'MCQ') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return res.status(400).json({ success: false, message: "MCQ questions must have at least 2 options" });
        }
        formattedOptions = q.options.map(o => typeof o === 'string' ? o.trim() : o).filter(Boolean);
        if (!formattedOptions.includes(q.correctAnswer.trim())) {
          return res.status(400).json({ success: false, message: "Correct answer must match one of the MCQ options" });
        }
      } else if (q.type === 'True-False') {
        formattedOptions = ['True', 'False'];
        if (q.correctAnswer !== 'True' && q.correctAnswer !== 'False') {
          return res.status(400).json({ success: false, message: "True-False correctAnswer must be 'True' or 'False'" });
        }
      }

      sanitizedQuestions.push({
        text: q.text.trim(),
        type: q.type,
        options: formattedOptions,
        correctAnswer: q.correctAnswer.trim(),
        difficulty: q.difficulty,
        tags: Array.isArray(q.tags) ? q.tags.map(t => typeof t === 'string' ? t.trim() : t).filter(Boolean) : []
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const createdQuestions = await Question.insertMany(sanitizedQuestions, { session });
      const questionIds = createdQuestions.map(question => question._id);

      const newQuiz = new Quiz({
        title: title.trim(),
        description: description ? description.trim() : "",
        professorId: req.user.id,
        questions: questionIds,
        isApproved: true
      });

      const savedQuiz = await newQuiz.save({ session });
      await session.commitTransaction();
      session.endSession();

      const populatedQuiz = await Quiz.findById(savedQuiz._id).populate('questions');

      res.status(201).json({
        success: true,
        message: "Quiz created successfully",
        data: populatedQuiz
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
 * @desc    Fetch a quiz by ID
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
