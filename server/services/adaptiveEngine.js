import Question from '../models/Question.js';
import QuizVariant from '../models/QuizVariant.js';

const MAX_REMEDIATION_DEPTH = 3;
export const REMEDIATION_LIMIT_MESSAGE =
  'Maximum adaptive remediation depth reached. Please review core study materials.';

const toIdString = (value) => value?._id?.toString?.() || value?.toString?.() || '';

const sanitizeQuestion = (question) => ({
  _id: question._id,
  text: question.text,
  type: question.type,
  options: question.options || [],
  difficulty: question.difficulty,
  tags: question.tags || [],
});

const snapshotQuestion = (question) => ({
  _id: question._id,
  text: question.text,
  type: question.type,
  options: question.options || [],
  correctAnswer: question.correctAnswer,
  difficulty: question.difficulty,
  tags: question.tags || [],
});

const rankTags = (questions) => {
  const counts = new Map();

  for (const question of questions) {
    const tags = Array.isArray(question.tags) ? question.tags : [];
    for (const tag of tags) {
      const cleanTag = String(tag).trim();
      if (!cleanTag) continue;
      counts.set(cleanTag, (counts.get(cleanTag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
};

const getFailedQuestions = (questions, gradedAnswers) => {
  const questionMap = new Map(questions.map((question) => [toIdString(question._id), question]));
  return gradedAnswers
    .filter((answer) => !answer.isCorrect)
    .map((answer) => questionMap.get(toIdString(answer.questionId)))
    .filter(Boolean);
};

const sampleQuestions = async ({ difficulty, size, excludeIds, targetTag }) => {
  const match = {
    _id: { $nin: excludeIds },
    difficulty,
  };

  if (targetTag) {
    match.tags = targetTag;
  }

  return Question.aggregate([
    { $match: match },
    { $sample: { size } },
  ]);
};

export const sanitizeVariantQuestions = (questions) => questions.map(sanitizeQuestion);

export const buildAdaptiveVariant = async ({
  baselineQuiz,
  studentId,
  type,
  sourceQuestions,
  gradedAnswers,
}) => {
  const dynamicSetSize = Math.max(3, Math.ceil(baselineQuiz.questions.length * 0.3));
  const existingVariant = await QuizVariant.findOne({
    baselineQuizId: baselineQuiz._id,
    studentId,
    type,
  }).sort({ attemptDepth: -1 });

  if (type === 'remediation' && existingVariant?.attemptDepth >= MAX_REMEDIATION_DEPTH) {
    return {
      limitReached: true,
      message: REMEDIATION_LIMIT_MESSAGE,
    };
  }

  const attemptDepth = existingVariant ? existingVariant.attemptDepth + 1 : 1;
  const difficulty = type === 'remediation' ? 'easy' : 'hard';
  const excludeIds = [
    ...baselineQuiz.questions.map((question) => question._id),
    ...sourceQuestions.map((question) => question._id),
  ];
  const targetingQuestions =
    type === 'remediation' ? getFailedQuestions(sourceQuestions, gradedAnswers) : sourceQuestions;
  const rankedTags = rankTags(targetingQuestions);

  let selectedQuestions = [];

  if (rankedTags.length > 0) {
    selectedQuestions = await sampleQuestions({
      difficulty,
      size: dynamicSetSize,
      excludeIds,
      targetTag: rankedTags[0],
    });
  }

  if (selectedQuestions.length === 0) {
    selectedQuestions = await sampleQuestions({
      difficulty,
      size: dynamicSetSize,
      excludeIds,
    });
  }

  if (selectedQuestions.length === 0) {
    return {
      limitReached: false,
      variant: null,
      questions: [],
    };
  }

  const variant = await QuizVariant.create({
    baselineQuizId: baselineQuiz._id,
    studentId,
    type,
    attemptDepth,
    questions: selectedQuestions.map(snapshotQuestion),
  });

  return {
    limitReached: false,
    variant,
    questions: sanitizeVariantQuestions(variant.questions),
  };
};
