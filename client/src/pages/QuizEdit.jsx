import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import QuestionPreviewCard from '../components/QuestionPreviewCard';
import {
  DIFFICULTIES,
  clampQuestionCount,
  createBlankQuestion,
  normalizeQuestion,
} from '../utils/quizConstants';

const QuizEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quizTitle, setQuizTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [fetchError, setFetchError] = useState('');

  const interactionLocked = saving;

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/quizzes/${id}`);
        if (response.data?.success) {
          const quiz = response.data.data;
          setQuizTitle(quiz.title || '');
          setDescription(quiz.description || '');
          const normalizedQuestions = (quiz.questions || []).map((q, index) =>
            normalizeQuestion(q, index, 'medium')
          );
          setQuestions(normalizedQuestions);
        } else {
          setFetchError('Failed to load quiz data.');
        }
      } catch (err) {
        console.error(err);
        setFetchError(err.response?.data?.message || 'Error loading quiz from server.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id]);

  const updateQuestion = (questionIndex, updates) => {
    setQuestions((currentQuestions) => currentQuestions.map((question, index) => (
      index === questionIndex ? { ...question, ...updates } : question
    )));
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setQuestions((currentQuestions) => currentQuestions.map((question, index) => {
      if (index !== questionIndex) return question;
      const options = [...question.options];
      options[optionIndex] = value;
      return { ...question, options };
    }));
  };

  const handleAddManualQuestion = () => {
    setQuestions((currentQuestions) => [...currentQuestions, createBlankQuestion(difficulty)]);
    setError('');
    setStatusMessage('');
  };

  const handleRemoveQuestion = (questionIndex) => {
    if (interactionLocked) return;
    setQuestions((currentQuestions) => currentQuestions.filter((_, index) => index !== questionIndex));
  };

  const handleQuestionTypeChange = (questionIndex, type) => {
    setQuestions((currentQuestions) => currentQuestions.map((question, index) => {
      if (index !== questionIndex) return question;

      if (type === 'MCQ') {
        const options = question.options.length >= 2 ? question.options : ['', '', '', ''];
        return { ...question, type, options, correctAnswer: '', correctAnswerIndex: -1 };
      }

      if (type === 'True-False') {
        return { ...question, type, options: ['True', 'False'], correctAnswer: 'True', correctAnswerIndex: 0 };
      }

      return { ...question, type, options: [], correctAnswer: '', correctAnswerIndex: -1 };
    }));
  };

  const handleAddChoice = (questionIndex) => {
    setQuestions((currentQuestions) => currentQuestions.map((question, index) => (
      index === questionIndex ? { ...question, options: [...question.options, ''] } : question
    )));
  };

  const handleRemoveChoice = (questionIndex, optionIndex) => {
    setQuestions((currentQuestions) => currentQuestions.map((question, index) => {
      if (index !== questionIndex || question.options.length <= 2) return question;
      const options = question.options.filter((_, optionPosition) => optionPosition !== optionIndex);
      let correctAnswerIndex = question.correctAnswerIndex;
      if (correctAnswerIndex === optionIndex) {
        correctAnswerIndex = -1;
      } else if (correctAnswerIndex > optionIndex) {
        correctAnswerIndex -= 1;
      }
      const correctAnswer = correctAnswerIndex >= 0 ? (options[correctAnswerIndex] || '') : '';
      return { ...question, options, correctAnswerIndex, correctAnswer };
    }));
  };

  const validateForSave = () => {
    if (!quizTitle.trim()) return 'Add a quiz title before saving.';
    if (questions.length === 0) return 'Add at least one question before saving.';

    for (const [index, question] of questions.entries()) {
      const label = `Question ${index + 1}`;
      if (!question.text.trim()) return `${label} needs question text.`;
      if (question.type === 'MCQ') {
        const options = question.options.map((option) => option.trim()).filter(Boolean);
        if (options.length < 2) return `${label} needs at least two answer choices.`;
        if (question.correctAnswerIndex < 0 || !options.includes(question.options[question.correctAnswerIndex]?.trim())) {
          return `${label} correct answer must match one of its choices.`;
        }
      } else {
        if (!question.correctAnswer.trim()) return `${label} needs a correct answer.`;
        if (question.type === 'True-False' && !['True', 'False'].includes(question.correctAnswer)) {
          return `${label} correct answer must be True or False.`;
        }
      }
    }

    return '';
  };

  const handleSave = async () => {
    const validationError = validateForSave();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);

    const payload = {
      title: quizTitle.trim(),
      description: description.trim(),
      questions: questions.map((question) => {
        const correctAnswer = question.type === 'MCQ' && question.correctAnswerIndex >= 0
          ? (question.options[question.correctAnswerIndex] || '').trim()
          : question.correctAnswer.trim();
        return {
          text: question.text.trim(),
          type: question.type,
          options: question.type === 'Short-Answer'
            ? []
            : question.options.map((option) => option.trim()).filter(Boolean),
          correctAnswer,
          difficulty: question.difficulty,
          tags: question.tags || [],
        };
      }),
    };

    try {
      await api.updateQuiz(id, payload);
      setStatusMessage('Quiz updated successfully. Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to update this quiz.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="w-10 h-10 animate-spin text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-400 text-sm font-medium">Loading quiz data...</span>
        </div>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
        <div className="border-2 border-red-500/30 rounded-2xl p-16 text-center bg-red-950/10">
          <h3 className="text-red-300 font-bold text-lg mb-1">Failed to Load Quiz</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">{fetchError}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300 mb-2">
            Quiz Editing Workspace
          </p>
          <h1
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-300 via-cyan-300 to-green-300 bg-clip-text text-transparent"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Edit Quiz
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Modify quiz title, description, and questions. All changes are saved atomically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          disabled={interactionLocked}
          className="self-start lg:self-auto px-4 py-2 rounded-lg text-sm font-semibold border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400/50 disabled:opacity-50"
        >
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/35 bg-red-950/25 px-4 py-3 text-sm font-medium text-red-200">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm font-semibold text-emerald-200">
          {statusMessage}
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white">
              Edit Quiz Questions
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Review existing questions, make changes, and save when ready.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleAddManualQuestion}
              disabled={interactionLocked}
              className="rounded-xl border border-cyan-400/40 px-5 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-950/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add Question
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={interactionLocked}
              className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_10px_24px_rgba(52,211,153,0.2)] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
            <div>
              <label htmlFor="editQuizTitle" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Quiz Title
              </label>
              <input
                id="editQuizTitle"
                value={quizTitle}
                disabled={interactionLocked}
                onChange={(event) => setQuizTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/45 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
                placeholder="e.g. Chapter 4 AI Review"
              />
            </div>
            <div>
              <label htmlFor="editQuizDescription" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Description
              </label>
              <input
                id="editQuizDescription"
                value={description}
                disabled={interactionLocked}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/45 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
                placeholder="Optional student-facing context"
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {questions.map((question, questionIndex) => (
            <QuestionPreviewCard
              key={question.id}
              question={question}
              questionIndex={questionIndex}
              onUpdate={updateQuestion}
              onUpdateOption={updateOption}
              onTypeChange={handleQuestionTypeChange}
              onAddChoice={handleAddChoice}
              onRemoveChoice={handleRemoveChoice}
              onRemove={handleRemoveQuestion}
              disabled={interactionLocked}
            />
          ))}
        </div>
      </section>
    </main>
  );
};

export default QuizEdit;
