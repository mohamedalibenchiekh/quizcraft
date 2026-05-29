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

      const rawSelected = userAnswer.selectedAnswer;
      const selectedStr =
        rawSelected != null && typeof rawSelected === 'string'
          ? rawSelected.trim()
          : '';
      const correctStr =
        question.correctAnswer != null && typeof question.correctAnswer === 'string'
          ? question.correctAnswer.trim()
          : '';

      const isCorrect =
        selectedStr !== '' &&
        selectedStr.toLowerCase() === correctStr.toLowerCase();

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

      let simplifiedQuestions = [];
      const excludeIds = questions.map((q) => q._id);

      if (topicTags.length > 0) {
        simplifiedQuestions = await Question.aggregate([
          { $match: { _id: { $nin: excludeIds }, difficulty: 'easy', tags: { $in: topicTags } } },
          { $sample: { size: ADAPTIVE_SET_SIZE } },
        ]);
      }

      // Fallback query if no questions found matching tags
      if (simplifiedQuestions.length === 0) {
        simplifiedQuestions = await Question.aggregate([
          { $match: { _id: { $nin: excludeIds }, difficulty: 'easy' } },
          { $sample: { size: ADAPTIVE_SET_SIZE } },
        ]);
      }

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

      let advancedQuestions = [];
      const excludeIds = questions.map((q) => q._id);

      if (topicTags.length > 0) {
        advancedQuestions = await Question.aggregate([
          { $match: { _id: { $nin: excludeIds }, difficulty: 'hard', tags: { $in: topicTags } } },
          { $sample: { size: ADAPTIVE_SET_SIZE } },
        ]);
      }

      // Fallback query if no questions found matching tags
      if (advancedQuestions.length === 0) {
        advancedQuestions = await Question.aggregate([
          { $match: { _id: { $nin: excludeIds }, difficulty: 'hard' } },
          { $sample: { size: ADAPTIVE_SET_SIZE } },
        ]);
      }

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
      userId: req.user.id,
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
      status: responseStatus,
      ratio: scoreRatio,
      data: {
        attemptId: attempt._id,
        score,
        totalQuestions,
        scoreRatio,
        correctCount,
        adaptiveTriggered,
        adaptiveType,
      },
    };

    if (adaptiveTriggered && adaptiveQuestions.length > 0) {
      payload.adaptiveDeck = adaptiveQuestions;
      payload.adaptiveQuestions = adaptiveQuestions; // Keep for test and client compatibility
    }

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};
