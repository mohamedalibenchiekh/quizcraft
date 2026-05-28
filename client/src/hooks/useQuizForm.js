import { useState, useCallback } from 'react';
import { createBlankQuestion } from '../utils/quizConstants';

const useQuizForm = (initialQuestions = []) => {
  const [questions, setQuestions] = useState(initialQuestions);
  const [difficulty, setDifficulty] = useState('medium');

  const updateQuestion = useCallback((questionIndex, updates) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === questionIndex ? { ...q, ...updates } : q))
    );
  }, []);

  const updateOption = useCallback((questionIndex, optionIndex, value) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;
        const options = [...q.options];
        options[optionIndex] = value;
        return { ...q, options };
      })
    );
  }, []);

  const handleAddManualQuestion = useCallback(() => {
    setQuestions((prev) => [...prev, createBlankQuestion(difficulty)]);
  }, [difficulty]);

  const handleRemoveQuestion = useCallback((questionIndex) => {
    setQuestions((prev) => prev.filter((_, i) => i !== questionIndex));
  }, []);

  const handleQuestionTypeChange = useCallback((questionIndex, type) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex) return q;

        if (type === 'MCQ') {
          const options = q.options.length >= 2 ? q.options : ['', '', '', ''];
          return { ...q, type, options, correctAnswer: '', correctAnswerIndex: -1 };
        }

        if (type === 'True-False') {
          return { ...q, type, options: ['True', 'False'], correctAnswer: 'True', correctAnswerIndex: 0 };
        }

        return { ...q, type, options: [], correctAnswer: '', correctAnswerIndex: -1 };
      })
    );
  }, []);

  const handleAddChoice = useCallback((questionIndex) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === questionIndex ? { ...q, options: [...q.options, ''] } : q
      )
    );
  }, []);

  const handleRemoveChoice = useCallback((questionIndex, optionIndex) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== questionIndex || q.options.length <= 2) return q;
        const options = q.options.filter((_, oi) => oi !== optionIndex);
        let correctAnswerIndex = q.correctAnswerIndex;
        if (correctAnswerIndex === optionIndex) {
          correctAnswerIndex = -1;
        } else if (correctAnswerIndex > optionIndex) {
          correctAnswerIndex -= 1;
        }
        const correctAnswer =
          correctAnswerIndex >= 0 ? options[correctAnswerIndex] || '' : '';
        return { ...q, options, correctAnswerIndex, correctAnswer };
      })
    );
  }, []);

  const validateQuestions = useCallback((quizTitle, questionsList) => {
    if (!quizTitle.trim()) return 'Add a quiz title before saving.';
    if (questionsList.length === 0) return 'Add at least one question before saving.';

    for (const [index, question] of questionsList.entries()) {
      const label = `Question ${index + 1}`;
      if (!question.text.trim()) return `${label} needs question text.`;
      if (question.type === 'MCQ') {
        const options = question.options.map((o) => o.trim()).filter(Boolean);
        if (options.length < 2) return `${label} needs at least two answer choices.`;
        if (
          question.correctAnswerIndex < 0 ||
          !options.includes(question.options[question.correctAnswerIndex]?.trim())
        ) {
          return `${label} correct answer must match one of its choices.`;
        }
      } else {
        if (!question.correctAnswer.trim()) return `${label} needs a correct answer.`;
        if (
          question.type === 'True-False' &&
          !['True', 'False'].includes(question.correctAnswer)
        ) {
          return `${label} correct answer must be True or False.`;
        }
      }
    }

    return '';
  }, []);

  const buildQuestionPayload = useCallback((questionsList) => {
    return questionsList.map((question) => {
      const correctAnswer =
        question.type === 'MCQ' && question.correctAnswerIndex >= 0
          ? (question.options[question.correctAnswerIndex] || '').trim()
          : question.correctAnswer.trim();
      return {
        text: question.text.trim(),
        type: question.type,
        options:
          question.type === 'Short-Answer'
            ? []
            : question.options.map((o) => o.trim()).filter(Boolean),
        correctAnswer,
        difficulty: question.difficulty,
        tags: question.tags || [],
      };
    });
  }, []);

  return {
    questions,
    setQuestions,
    difficulty,
    setDifficulty,
    updateQuestion,
    updateOption,
    handleAddManualQuestion,
    handleRemoveQuestion,
    handleQuestionTypeChange,
    handleAddChoice,
    handleRemoveChoice,
    validateQuestions,
    buildQuestionPayload,
  };
};

export default useQuizForm;
