import Attempt from '../models/Attempt.js';
import Quiz from '../models/Quiz.js';
import Question from '../models/Question.js';

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
    const attempts = await Attempt.find({ userId: req.user.id })
      .select('scoreRatio adaptiveType');

    const totalQuizzes = attempts.length;

    const averageScoreRatio =
      totalQuizzes > 0
        ? attempts.reduce((sum, a) => sum + a.scoreRatio, 0) / totalQuizzes
        : 0;

    const enrichmentCount = attempts.filter(
      (a) => a.adaptiveType === 'enrichment'
    ).length;

    const trophies = enrichmentCount;

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
    for (const q of quiz.questions) {
      questionMap[q._id.toString()] = q;
    }

    const detailedAnswers = attempt.answers.map((a) => {
      const question = questionMap[a.questionId.toString()] || null;
      return {
        questionId: a.questionId,
        questionText: question ? question.text : 'Unknown question',
        questionType: question ? question.type : null,
        options: question ? question.options : [],
        difficulty: question ? question.difficulty : null,
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
