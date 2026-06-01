import mongoose from 'mongoose';
import Attempt from '../models/Attempt.js';
import Quiz from '../models/Quiz.js';
import QuizVariant from '../models/QuizVariant.js';

export const getMyAttempts = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ userId: req.user.id })
      .populate({ path: 'quizId', select: 'title description' })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyStats = async (req, res, next) => {
  try {
    const [stats] = await Attempt.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $facet: {
          overall: [
            {
              $group: {
                _id: null,
                totalQuizzes: { $sum: 1 },
                averageScoreRatio: { $avg: '$scoreRatio' },
              },
            },
          ],
          trophies: [
            { $match: { adaptiveType: 'enrichment' } },
            {
              $group: {
                _id: null,
                enrichmentBaselineIds: { $addToSet: { $ifNull: ['$baselineQuizId', '$quizId'] } },
              },
            },
            {
              $project: {
                _id: 0,
                trophies: { $size: '$enrichmentBaselineIds' },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalQuizzes: { $ifNull: [{ $arrayElemAt: ['$overall.totalQuizzes', 0] }, 0] },
          averageScoreRatio: { $ifNull: [{ $arrayElemAt: ['$overall.averageScoreRatio', 0] }, 0] },
          trophies: { $ifNull: [{ $arrayElemAt: ['$trophies.trophies', 0] }, 0] },
        },
      },
    ]);

    const totalQuizzes = stats?.totalQuizzes || 0;
    const averageScoreRatio = stats?.averageScoreRatio || 0;
    const trophies = stats?.trophies || 0;

    res.status(200).json({
      success: true,
      data: {
        totalQuizzes,
        averageScoreRatio: Math.round(averageScoreRatio * 100),
        trophies,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAttemptById = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found.',
      });
    }

    if (attempt.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — you can only view your own attempts.',
      });
    }

    const quiz = await Quiz.findById(attempt.quizId).populate('questions');

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: 'Associated quiz not found.',
      });
    }

    const questionMap = {};
    const answerSource = attempt.quizVariantId
      ? await QuizVariant.findById(attempt.quizVariantId)
      : null;
    const questions = answerSource?.questions || quiz.questions;

    for (const q of questions) {
      questionMap[q._id.toString()] = q;
    }

    const detailedAnswers = attempt.answers.map((a) => {
      // Prefer the snapshot stored on the answer at submit time; fall back to a
      // live lookup for older attempts saved before snapshots were introduced.
      const question = questionMap[a.questionId.toString()] || null;
      return {
        questionId: a.questionId,
        questionText: a.questionText || question?.text || 'Unknown question',
        questionType: a.questionType || question?.type || null,
        options: a.options?.length ? a.options : question?.options || [],
        difficulty: a.difficulty || question?.difficulty || null,
        selectedAnswer: a.selectedAnswer,
        isCorrect: a.isCorrect,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        quizTitle: quiz.title,
        quizDescription: quiz.description,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        scoreRatio: attempt.scoreRatio,
        adaptiveTriggered: attempt.adaptiveTriggered,
        adaptiveType: attempt.adaptiveType,
        completedAt: attempt.createdAt,
        answers: detailedAnswers,
      },
    });
  } catch (error) {
    next(error);
  }
};
