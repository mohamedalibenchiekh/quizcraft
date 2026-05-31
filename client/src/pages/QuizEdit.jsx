import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import QuestionPreviewCard from '../components/QuestionPreviewCard';
import AdaptiveReadinessPanel from '../components/AdaptiveReadinessPanel';
import useQuizForm from '../hooks/useQuizForm';
import { normalizeQuestion } from '../utils/quizConstants';

const QuizEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    questions,
    setQuestions,
    updateQuestion,
    updateOption,
    handleAddManualQuestion,
    handleRemoveQuestion,
    handleQuestionTypeChange,
    handleAddChoice,
    handleRemoveChoice,
    validateQuestions,
    buildQuestionPayload,
  } = useQuizForm([]);

  const [quizTitle, setQuizTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [readiness, setReadiness] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [readinessError, setReadinessError] = useState('');

  // High-Fidelity UX states
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');

  const interactionLocked = saving;

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        setFetchError('');
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

        try {
          setReadinessLoading(true);
          setReadiness(null);
          setReadinessError('');
          const readinessResponse = await api.get(`/quizzes/${id}/adaptive-readiness`);
          if (readinessResponse.data?.success) {
            setReadiness(readinessResponse.data.data);
          } else {
            setReadiness(null);
            setReadinessError(readinessResponse.data?.message || 'Unable to load adaptive readiness.');
          }
        } catch (readinessErr) {
          setReadiness(null);
          setReadinessError(readinessErr.response?.data?.message || 'Unable to load adaptive readiness.');
        } finally {
          setReadinessLoading(false);
        }
      } catch (err) {
        console.error(err);
        setFetchError(err.response?.data?.message || 'Error loading quiz from server.');
        setReadiness(null);
        setReadinessLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [id]);

  // Collapse / Expand Handlers
  const toggleCollapse = (questionId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(questions.map((q) => q.id)));

  // Scroll to question with flash highlight
  const scrollToQuestion = (index, questionId) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });

    setTimeout(() => {
      const element = document.getElementById(`question-card-${index}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-2', 'dark:ring-offset-slate-950');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-2', 'dark:ring-offset-slate-950');
        }, 1500);
      }
    }, 100);
  };

  // Swap reorder handler
  const handleMoveQuestion = (index, direction) => {
    if (interactionLocked) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const nextQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [nextQuestions[index], nextQuestions[targetIndex]] = [nextQuestions[targetIndex], nextQuestions[index]];
    setQuestions(nextQuestions);
  };

  // Bulk Actions
  const handleBulkDifficulty = (diff) => {
    if (interactionLocked) return;
    setQuestions((prev) => prev.map((q) => ({ ...q, difficulty: diff })));
    setStatusMessage(`Applied "${diff}" difficulty to all questions.`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleBulkAddTag = () => {
    if (interactionLocked) return;
    const cleanTag = bulkTagInput.trim();
    if (!cleanTag) return;
    setQuestions((prev) =>
      prev.map((q) => {
        const currentTags = q.tags || [];
        return currentTags.includes(cleanTag) ? q : { ...q, tags: [...currentTags, cleanTag] };
      })
    );
    setBulkTagInput('');
    setStatusMessage(`Added tag "${cleanTag}" to all questions.`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleBulkClearTags = () => {
    if (interactionLocked) return;
    setQuestions((prev) => prev.map((q) => ({ ...q, tags: [] })));
    setStatusMessage('Cleared all question tags.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Live Telemetry
  const difficultyCounts = questions.reduce(
    (acc, q) => {
      const d = q.difficulty || 'medium';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0 }
  );

  const typeCounts = questions.reduce(
    (acc, q) => {
      const t = q.type || 'MCQ';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    },
    { MCQ: 0, 'True-False': 0, 'Short-Answer': 0 }
  );

  const estimatedTimeMinutes = Math.ceil(
    questions.reduce((sum, q) => {
      if (q.type === 'MCQ') return sum + 60;
      if (q.type === 'True-False') return sum + 30;
      if (q.type === 'Short-Answer') return sum + 90;
      return sum + 60;
    }, 0) / 60
  );

  const onAddQuestion = () => {
    if (interactionLocked) return;
    setError('');
    setStatusMessage('');
    handleAddManualQuestion();
  };

  const onRemoveQuestion = (index) => {
    if (interactionLocked) return;
    setError('');
    setStatusMessage('');
    handleRemoveQuestion(index);
  };

  const handleSave = async () => {
    const validationError = validateQuestions(quizTitle, questions);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSaving(true);

    const payload = {
      title: quizTitle.trim(),
      description: description.trim(),
      questions: buildQuestionPayload(questions),
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

  // Loading State
  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <span className="text-slate-600 dark:text-slate-400 text-sm font-semibold tracking-wide">Loading quiz workspace...</span>
        </div>
      </main>
    );
  }

  // Fetch Error State
  if (fetchError) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
        <div className="border-2 border-red-500/30 rounded-2xl p-16 text-center bg-red-50 dark:bg-red-950/10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/30 text-red-600">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h3 className="text-red-700 dark:text-red-300 font-bold text-lg mb-1">Failed to Load Quiz</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto mb-6">{fetchError}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 rounded-lg text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-cyan-400 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300 mb-2">
            Quiz Editing Workspace
          </p>
          <h1
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-cyan-600 to-green-600 dark:from-violet-300 dark:via-cyan-300 dark:to-green-300 bg-clip-text text-transparent"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Edit Quiz
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Modify quiz title, description, reorder questions, and save all changes atomically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          disabled={interactionLocked}
          className="self-start lg:self-auto px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-cyan-400 disabled:opacity-50 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Alert Banners */}
      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/35 bg-red-50 dark:bg-red-950/25 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-200">
          {error}
        </div>
      )}
      {statusMessage && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          {statusMessage}
        </div>
      )}

      {/* Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-6 items-start">

        {/* ─── STICKY CONTROL SIDEBAR ─────────────────────────── */}
        <aside className="lg:sticky lg:top-6 space-y-5">

          {/* Telemetry Panel */}
          <div className="glass-card p-5 border border-slate-300 dark:border-slate-700 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
              <span>Quiz Metrics</span>
              <span className="bg-violet-400/20 text-violet-700 dark:text-violet-300 text-[10px] font-black px-2 py-0.5 rounded">
                Editing
              </span>
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-600 dark:text-slate-400">Total Questions:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-100">{questions.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-600 dark:text-slate-400">Est. Duration:</span>
                <span className="font-extrabold text-cyan-600 dark:text-cyan-300">
                  ⏱️ ~{estimatedTimeMinutes} min
                </span>
              </div>

              {/* Difficulty breakdown */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-2">Difficulty Mix</span>
                <div className="flex gap-1.5">
                  {[
                    { key: 'easy', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-950/30' },
                    { key: 'medium', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                    { key: 'hard', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/30' },
                  ].map(({ key, color, bg }) => (
                    <div key={key} className={`flex-1 text-center ${bg} rounded-lg py-1.5 border border-slate-200 dark:border-slate-800/80`}>
                      <div className="text-[9px] uppercase font-bold text-slate-500">{key}</div>
                      <div className={`text-sm font-black mt-0.5 ${color}`}>{difficultyCounts[key]}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Type breakdown bar chart */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">Question Types</span>
                {[
                  { key: 'MCQ', label: 'MCQ', color: 'bg-violet-500' },
                  { key: 'True-False', label: 'True / False', color: 'bg-emerald-500' },
                  { key: 'Short-Answer', label: 'Short Answer', color: 'bg-cyan-500' },
                ].map(({ key, label, color }) => {
                  const count = typeCounts[key] || 0;
                  const pct = questions.length > 0 ? (count / questions.length) * 100 : 0;
                  return (
                    <div key={key} className="text-xs">
                      <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                        <span>{label}</span>
                        <span>{count}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <AdaptiveReadinessPanel
            readiness={readiness}
            loading={readinessLoading}
            error={readinessError}
          />

          {/* Bulk Actions Panel */}
          <div className="glass-card p-5 border border-slate-300 dark:border-slate-700 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Bulk Operations
            </h3>
            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block mb-1.5">Set Difficulty for All:</span>
                <div className="grid grid-cols-3 gap-1">
                  {['easy', 'medium', 'hard'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleBulkDifficulty(d)}
                      disabled={interactionLocked}
                      className="px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-900/60 hover:bg-cyan-400/20 border border-slate-300 dark:border-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="editBulkTagInput" className="text-[10px] font-bold text-slate-500 block mb-1.5">
                  Tag All Questions:
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="editBulkTagInput"
                    value={bulkTagInput}
                    onChange={(e) => setBulkTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleBulkAddTag()}
                    placeholder="Tag name"
                    disabled={interactionLocked}
                    className="flex-1 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-2 py-1.5 text-xs text-slate-800 dark:text-white outline-none focus:border-cyan-400 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleBulkAddTag}
                    disabled={interactionLocked}
                    className="px-3 py-1.5 rounded bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-colors shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Apply
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBulkClearTags}
                disabled={interactionLocked}
                className="w-full text-center py-1.5 rounded border border-red-500/25 text-red-500 dark:text-red-400 bg-red-50/10 hover:bg-red-50/30 text-xs font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                Clear All Question Tags
              </button>
            </div>
          </div>

          {/* Outline Side Panel */}
          <div className="glass-card p-5 border border-slate-300 dark:border-slate-700 shadow-md">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quiz Outline
              </h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-300 hover:underline"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-300 hover:underline"
                >
                  Collapse All
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {questions.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">No questions yet.</p>
              )}
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  onClick={() => !interactionLocked && scrollToQuestion(index, q.id)}
                  className={`group flex items-center justify-between gap-2 p-1.5 rounded-lg overflow-hidden bg-slate-100/40 dark:bg-slate-900/20 border border-transparent transition-colors ${interactionLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/40 cursor-pointer hover:border-cyan-400/20'}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300">
                      {index + 1}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-slate-200/50 dark:bg-slate-800/30 px-1 rounded text-slate-600 dark:text-slate-400 shrink-0">
                      {q.type === 'True-False' ? 'TF' : q.type === 'Short-Answer' ? 'SA' : 'MCQ'}
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 truncate" title={q.text}>
                      {q.text || <span className="italic text-slate-400">Empty question</span>}
                    </span>
                  </div>

                  <div className={`flex items-center shrink-0 opacity-40 group-hover:opacity-100 gap-0.5 transition-opacity ${interactionLocked ? '!opacity-30 pointer-events-none' : ''}`}>
                    <button
                      type="button"
                      disabled={interactionLocked || index === 0}
                      onClick={(e) => { e.stopPropagation(); handleMoveQuestion(index, 'up'); }}
                      className="p-0.5 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={interactionLocked || index === questions.length - 1}
                      onClick={(e) => { e.stopPropagation(); handleMoveQuestion(index, 'down'); }}
                      className="p-0.5 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      disabled={interactionLocked}
                      onClick={(e) => { e.stopPropagation(); onRemoveQuestion(index); }}
                      className="p-0.5 hover:bg-red-200/40 hover:text-red-500 rounded text-slate-600 dark:text-slate-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ─── MAIN EDITING WORKSPACE ─────────────────────────── */}
        <div className="space-y-6">
          {/* Workspace Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-100/50 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                Edit Quiz Questions
              </h2>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                Review existing questions, reorder, make changes, and save when ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={onAddQuestion}
                disabled={interactionLocked}
                className="rounded-xl border border-cyan-400/40 px-4 py-2.5 text-sm font-bold text-cyan-700 dark:text-cyan-100 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                + Add Question
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={interactionLocked}
                className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_8px_20px_rgba(52,211,153,0.25)] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Title & Description Inputs */}
          <div className="glass-card p-5 border border-slate-300 dark:border-slate-700 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
              <div>
                <label htmlFor="editQuizTitle" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Quiz Title
                </label>
                <input
                  id="editQuizTitle"
                  value={quizTitle}
                  disabled={interactionLocked}
                  onChange={(event) => setQuizTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-colors"
                  placeholder="e.g. Chapter 4 AI Review"
                />
              </div>
              <div>
                <label htmlFor="editQuizDescription" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Description
                </label>
                <input
                  id="editQuizDescription"
                  value={description}
                  disabled={interactionLocked}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-colors"
                  placeholder="Optional student-facing context"
                />
              </div>
            </div>
          </div>

          {/* Empty state */}
          {questions.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/20 p-12 text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No questions in this quiz.</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 mb-5">Add a question to get started.</p>
              <button
                type="button"
                onClick={onAddQuestion}
                disabled={interactionLocked}
                className="rounded-xl bg-cyan-400 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.25)]"
              >
                Add Question
              </button>
            </div>
          )}

          {/* Question Preview Cards */}
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
                onRemove={onRemoveQuestion}
                disabled={interactionLocked}
                isCollapsed={collapsedIds.has(question.id)}
                onToggleCollapse={() => toggleCollapse(question.id)}
                onMoveUp={() => handleMoveQuestion(questionIndex, 'up')}
                onMoveDown={() => handleMoveQuestion(questionIndex, 'down')}
                isFirst={questionIndex === 0}
                isLast={questionIndex === questions.length - 1}
              />
            ))}
          </div>

          {/* Bottom Save Bar (sticky on long lists) */}
          {questions.length > 3 && (
            <div className="sticky bottom-4 z-10 flex justify-end gap-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-3 shadow-xl">
              <button
                type="button"
                onClick={onAddQuestion}
                disabled={interactionLocked}
                className="rounded-xl border border-cyan-400/40 px-4 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-100 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 disabled:opacity-60 transition-colors"
              >
                + Add Question
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={interactionLocked}
                className="rounded-xl bg-emerald-400 px-5 py-2 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-60 transition-colors shadow-[0_4px_14px_rgba(52,211,153,0.3)]"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default QuizEdit;
