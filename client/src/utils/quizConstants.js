export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const QUESTION_TYPES = ['MCQ', 'True-False', 'Short-Answer'];
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];
export const MAX_FILES = 5;
export const MIN_QUESTIONS = 1;
export const MAX_QUESTIONS = 20;

export const clampQuestionCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MIN_QUESTIONS;
  return Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, Math.round(parsed)));
};

export const makeQuestionId = () => `ai-question-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const createBlankQuestion = (difficulty = 'medium') => ({
  id: makeQuestionId(),
  text: '',
  type: 'MCQ',
  options: ['', '', '', ''],
  correctAnswer: '',
  correctAnswerIndex: -1,
  difficulty,
  tags: [],
});

export const normalizeQuestion = (question, index, fallbackDifficulty) => {
  const type = question.type || 'MCQ';
  const normalizedType = QUESTION_TYPES.includes(type) ? type : 'MCQ';
  const options = Array.isArray(question.options) ? question.options.map((option) => String(option)) : [];
  const correctAnswer = question.correctAnswer ?? question.answer ?? '';
  const correctAnswerIndex = normalizedType === 'MCQ' && options.length > 0
    ? options.indexOf(correctAnswer)
    : -1;

  return {
    id: question.id || question._id || `${makeQuestionId()}-${index}`,
    text: question.text || question.question || '',
    type: normalizedType,
    options: normalizedType === 'Short-Answer' ? [] : options,
    correctAnswer,
    correctAnswerIndex,
    difficulty: DIFFICULTIES.includes(question.difficulty) ? question.difficulty : fallbackDifficulty,
    tags: Array.isArray(question.tags) ? question.tags : [],
  };
};
