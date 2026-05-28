import mongoose from 'mongoose';
import Attempt from '../models/Attempt.js';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';

const ADAPTIVE_SET_SIZE = 4;

function computeRatio(correctCount, totalCount) {
  if (totalCount === 0) return 0;
  return correctCount / totalCount;
}

/**
 * @desc    Submit a quiz attempt and evaluate performance for adaptive difficulty
 * @route   POST /api/attempts/submit
 */
export const submitAttempt = async (req, res, next) => {
  try {
    const { quizId, answers } = req.body;

    if (!quizId || !answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'quizId and a non-empty answers array are required.',
      });
    }

    const quiz = await Quiz.findById(quizId).populate('questions');
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }

    const questions = quiz.questions;
    const totalQuestions = questions.length;

    let correctCount = 0;
    const gradedAnswers = [];

    for (const question of questions) {
      const userAnswer = answers.find(
        (a) => a.questionId && a.questionId.toString() === question._id.toString()
      );

      if (!userAnswer) {
        gradedAnswers.push({
          questionId: question._id,
          selectedAnswer: null,
          isCorrect: false,
        });
        continue;
      }

      const isCorrect =
        userAnswer.selectedAnswer != null &&
        userAnswer.selectedAnswer.trim().toLowerCase() ===
          question.correctAnswer.trim().toLowerCase();

      if (isCorrect) correctCount++;

      gradedAnswers.push({
        questionId: question._id,
        selectedAnswer: userAnswer.selectedAnswer,
        isCorrect,
      });
    }

    const scoreRatio = computeRatio(correctCount, totalQuestions);
    const score = correctCount;

    let adaptiveTriggered = false;
    let adaptiveType = 'none';
    let adaptiveQuestions = [];
    let statusMessage = 'Quiz completed successfully.';
    let responseStatus = 'standard';

    const topicTags = [
      ...new Set(
        questions.flatMap((q) => (Array.isArray(q.tags) ? q.tags : []))
      ),
    ];

    // BOUNDARY A — QC-BR-04: Remediation Loop (ratio < 0.50)
    if (scoreRatio < 0.50) {
      adaptiveTriggered = true;
      adaptiveType = 'remediation';
      responseStatus = 'remediation';

      const filter = {
        _id: { $nin: questions.map((q) => q._id) },
        difficulty: 'easy',
      };
      if (topicTags.length > 0) {
        filter.tags = { $in: topicTags };
      }

      const simplifiedQuestions = await Question.aggregate([
        { $match: filter },
        { $sample: { size: ADAPTIVE_SET_SIZE } },
      ]);

      adaptiveQuestions = simplifiedQuestions.map((q) => ({
        _id: q._id,
        text: q.text,
        type: q.type,
        options: q.options,
        difficulty: q.difficulty,
        tags: q.tags,
      }));

      statusMessage = 'Remediation block unlocked.';
    }

    // BOUNDARY B — QC-BR-05: Enrichment Loop (ratio > 0.85)
    if (scoreRatio > 0.85) {
      adaptiveTriggered = true;
      adaptiveType = 'enrichment';
      responseStatus = 'enrichment';

      const filter = {
        _id: { $nin: questions.map((q) => q._id) },
        difficulty: 'hard',
      };
      if (topicTags.length > 0) {
        filter.tags = { $in: topicTags };
      }

      const advancedQuestions = await Question.aggregate([
        { $match: filter },
        { $sample: { size: ADAPTIVE_SET_SIZE } },
      ]);

      adaptiveQuestions = advancedQuestions.map((q) => ({
        _id: q._id,
        text: q.text,
        type: q.type,
        options: q.options,
        difficulty: q.difficulty,
        tags: q.tags,
      }));

      statusMessage = 'Advanced variant block triggered!';
    }

    // Persist attempt record
    const attempt = await Attempt.create({
      userId: req.user?.id || new mongoose.Types.ObjectId(),
      quizId: quiz._id,
      answers: gradedAnswers,
      score,
      totalQuestions,
      scoreRatio,
      adaptiveTriggered,
      adaptiveType,
    });

    const payload = {
      success: true,
      message: statusMessage,
      data: {
        attemptId: attempt._id,
        score,
        totalQuestions,
        scoreRatio,
        correctCount,
        adaptiveTriggered,
        adaptiveType,
      },
      status: responseStatus,
    };

    if (adaptiveTriggered && adaptiveQuestions.length > 0) {
      payload.adaptiveQuestions = adaptiveQuestions;
    }

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};
