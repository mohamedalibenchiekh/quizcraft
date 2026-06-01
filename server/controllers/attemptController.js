import Attempt from '../models/Attempt.js';
import Quiz from '../models/Quiz.js';
import QuizVariant from '../models/QuizVariant.js';
import {
  buildAdaptiveVariant,
  REMEDIATION_LIMIT_MESSAGE,
} from '../services/adaptiveEngine.js';
import { sanitizeAnswer, evaluateShortAnswerWithAI } from '../utils/gradingUtils.js';

function computeRatio(correctCount, totalCount) {
  if (totalCount === 0) return 0;
  return correctCount / totalCount;
}

const toIdString = (value) => value?._id?.toString?.() || value?.toString?.() || '';

const sanitizeVariantMetadata = (variant) => ({
  _id: variant._id,
  baselineQuizId: variant.baselineQuizId,
  type: variant.type,
  attemptDepth: variant.attemptDepth,
});

const normalizeAnswer = (value) => String(value || '').trim().toLowerCase();

const resolveSubmissionTarget = async (quizId, userId) => {
  const quiz = await Quiz.findById(quizId).populate('questions');
  if (quiz) {
    return {
      baselineQuiz: quiz,
      sourceVariant: null,
      questions: quiz.questions,
    };
  }

  const variant = await QuizVariant.findById(quizId);
  if (!variant) return null;

  if (variant.studentId.toString() !== userId) {
    return { forbidden: true };
  }

  const baselineQuiz = await Quiz.findById(variant.baselineQuizId).populate('questions');
  if (!baselineQuiz) return null;

  return {
    baselineQuiz,
    sourceVariant: variant,
    questions: variant.questions,
  };
};

const gradeQuestion = async (question, userAnswer) => {
  // Snapshot the question so historical reviews survive later quiz edits.
  const snapshot = {
    questionId: question._id,
    questionText: question.text,
    questionType: question.type,
    options: question.options || [],
    difficulty: question.difficulty,
  };

  if (!userAnswer) {
    return {
      ...snapshot,
      selectedAnswer: null,
      isCorrect: false,
    };
  }

  const selectedAnswer = userAnswer.selectedAnswer;

  if (question.type === 'Short-Answer') {
    const correctAnswer = question.correctAnswer;
    const sanitizedCorrect = sanitizeAnswer(correctAnswer);
    const sanitizedStudent = sanitizeAnswer(selectedAnswer);

    if (!sanitizedStudent) {
      return {
        ...snapshot,
        selectedAnswer,
        isCorrect: false,
        feedback: 'No answer provided.',
      };
    }

    if (sanitizedStudent === sanitizedCorrect) {
      return {
        ...snapshot,
        selectedAnswer,
        isCorrect: true,
        feedback: 'Answer matches the expected response.',
      };
    }

    const evaluation = await evaluateShortAnswerWithAI(
      question.questionText || question.text || '',
      correctAnswer,
      selectedAnswer,
    );

    return {
      ...snapshot,
      selectedAnswer,
      isCorrect: evaluation.isCorrect,
      feedback: evaluation.feedback,
    };
  }

  const isCorrect =
    normalizeAnswer(selectedAnswer) !== '' &&
    normalizeAnswer(selectedAnswer) === normalizeAnswer(question.correctAnswer);

  return {
    ...snapshot,
    selectedAnswer,
    isCorrect,
  };
};

const getNextAdaptiveType = ({ scoreRatio, sourceVariant }) => {
  if (sourceVariant?.type === 'enrichment') return null;
  if (scoreRatio < 0.5) return 'remediation';
  if (scoreRatio > 0.85) return 'enrichment';
  return null;
};

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

    const target = await resolveSubmissionTarget(quizId, req.user.id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Quiz not found.' });
    }
    if (target.forbidden) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - this adaptive quiz belongs to another student.',
      });
    }

    const { baselineQuiz, sourceVariant, questions } = target;
    const totalQuestions = questions.length;

    let correctCount = 0;
    const gradedAnswers = [];

    for (const question of questions) {
      const userAnswer = answers.find(
        (answer) => answer.questionId && toIdString(answer.questionId) === toIdString(question._id)
      );

      const gradedAnswer = await gradeQuestion(question, userAnswer);
      if (gradedAnswer.isCorrect) correctCount++;
      gradedAnswers.push(gradedAnswer);
    }

    const scoreRatio = computeRatio(correctCount, totalQuestions);
    const score = correctCount;
    const nextAdaptiveType = getNextAdaptiveType({ scoreRatio, sourceVariant });

    let adaptiveTriggered = false;
    let attemptAdaptiveType = sourceVariant?.type || 'none';
    let responseStatus = 'standard';
    let statusMessage = 'Quiz completed successfully.';
    let variantResult = null;

    if (nextAdaptiveType) {
      variantResult = await buildAdaptiveVariant({
        baselineQuiz,
        studentId: req.user.id,
        type: nextAdaptiveType,
        sourceQuestions: questions,
        gradedAnswers,
      });

      if (variantResult.limitReached) {
        responseStatus = 'adaptive-limit';
        statusMessage = REMEDIATION_LIMIT_MESSAGE;
        attemptAdaptiveType = nextAdaptiveType;
      } else if (variantResult.variant) {
        adaptiveTriggered = true;
        attemptAdaptiveType = nextAdaptiveType;
        responseStatus = nextAdaptiveType;
        statusMessage =
          nextAdaptiveType === 'remediation'
            ? 'Remediation block unlocked.'
            : 'Advanced variant block triggered!';
      }
    }

    const attempt = await Attempt.create({
      userId: req.user.id,
      quizId: baselineQuiz._id,
      baselineQuizId: baselineQuiz._id,
      quizVariantId: sourceVariant?._id,
      answers: gradedAnswers,
      score,
      totalQuestions,
      scoreRatio,
      adaptiveTriggered,
      adaptiveType: attemptAdaptiveType,
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
        adaptiveType: attemptAdaptiveType,
        quizVariantId: sourceVariant?._id || null,
        baselineQuizId: baselineQuiz._id,
      },
    };

    if (variantResult?.variant && variantResult.questions.length > 0) {
      payload.adaptiveVariantId = variantResult.variant._id;
      payload.adaptiveVariant = sanitizeVariantMetadata(variantResult.variant);
      payload.adaptiveDeck = variantResult.questions;
      payload.adaptiveQuestions = variantResult.questions;
    }

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};
