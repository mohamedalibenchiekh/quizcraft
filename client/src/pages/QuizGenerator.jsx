import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const QUESTION_TYPES = ['MCQ', 'True-False', 'Short-Answer'];
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];

const makeQuestionId = () => `ai-question-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createBlankQuestion = (difficulty = 'medium') => ({
  id: makeQuestionId(),
  text: '',
  type: 'MCQ',
  options: ['', '', '', ''],
  correctAnswer: '',
  difficulty,
  tags: [],
});

const clampQuestionCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(20, Math.max(1, Math.round(parsed)));
};

const getExtension = (fileName = '') => {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : '';
};

const normalizeQuestion = (question, index, fallbackDifficulty) => {
  const type = question.type || 'MCQ';
  const normalizedType = QUESTION_TYPES.includes(type) ? type : 'MCQ';
  const options = Array.isArray(question.options) ? question.options.map((option) => String(option)) : [];

  return {
    id: question.id || question._id || `${makeQuestionId()}-${index}`,
    text: question.text || question.question || '',
    type: normalizedType,
    options: normalizedType === 'Short-Answer' ? [] : options,
    correctAnswer: question.correctAnswer || question.answer || '',
    difficulty: DIFFICULTIES.includes(question.difficulty) ? question.difficulty : fallbackDifficulty,
    tags: Array.isArray(question.tags) ? question.tags : [],
  };
};

const QuizGenerator = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [creationMode, setCreationMode] = useState('ai');
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [quizTitle, setQuizTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const interactionLocked = isGenerating || isSaving;
  const hasDraftQuestions = generatedQuestions.length > 0;

  const fileSummary = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    return totalSize > 0 ? `${(totalSize / 1024 / 1024).toFixed(2)} MB selected` : 'No files selected';
  }, [files]);

  const addFiles = (incomingFiles) => {
    if (interactionLocked) return;

    const nextFiles = Array.from(incomingFiles || []);
    const invalidFiles = nextFiles.filter((file) => !ACCEPTED_EXTENSIONS.includes(getExtension(file.name)));
    const validFiles = nextFiles.filter((file) => ACCEPTED_EXTENSIONS.includes(getExtension(file.name)));

    if (invalidFiles.length > 0) {
      setError('Only PDF and DOCX files can be uploaded.');
    } else {
      setError('');
    }

    if (validFiles.length === 0) return;

    setFiles((currentFiles) => {
      const merged = [...currentFiles];
      validFiles.forEach((file) => {
        const duplicate = merged.some((existing) => (
          existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified
        ));
        if (!duplicate && merged.length < 5) {
          merged.push(file);
        }
      });
      return merged;
    });
  };

  const removeFile = (fileIndex) => {
    if (interactionLocked) return;
    setFiles((currentFiles) => currentFiles.filter((_, index) => index !== fileIndex));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const handleGenerate = async (event) => {
    event.preventDefault();

    if (files.length === 0) {
      setError('Attach at least one PDF or DOCX document before generating.');
      setGeneratedQuestions([]);
      return;
    }

    setError('');
    setStatusMessage('');
    setIsGenerating(true);

    const formData = new FormData();
    files.forEach((file) => formData.append('documents', file));
    formData.append('numQuestions', String(clampQuestionCount(numQuestions)));
    formData.append('difficulty', difficulty);

    try {
      const response = await api.generateQuizFromFiles(formData);
      const payload = response?.data || response;
      const questions = Array.isArray(payload?.questions) ? payload.questions : [];

      if (questions.length === 0) {
        setError('The AI engine returned no usable questions. Try a richer document or adjust the parameters.');
        setGeneratedQuestions([]);
        return;
      }

      setGeneratedQuestions(questions.map((question, index) => normalizeQuestion(question, index, difficulty)));
      setQuizTitle((currentTitle) => currentTitle || `AI Quiz - ${files[0]?.name?.replace(/\.[^/.]+$/, '') || 'Generated Draft'}`);
      setStatusMessage(`${questions.length} AI question${questions.length === 1 ? '' : 's'} ready for review.`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'AI generation failed. Please verify your documents and try again.');
      setGeneratedQuestions([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateQuestion = (questionIndex, updates) => {
    setGeneratedQuestions((currentQuestions) => currentQuestions.map((question, index) => (
      index === questionIndex ? { ...question, ...updates } : question
    )));
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setGeneratedQuestions((currentQuestions) => currentQuestions.map((question, index) => {
      if (index !== questionIndex) return question;
      const options = [...question.options];
      const previousValue = options[optionIndex];
      options[optionIndex] = value;
      return {
        ...question,
        options,
        correctAnswer: question.correctAnswer === previousValue ? value : question.correctAnswer,
      };
    }));
  };

  const handleAddManualQuestion = () => {
    setGeneratedQuestions((currentQuestions) => [...currentQuestions, createBlankQuestion(difficulty)]);
    setError('');
    setStatusMessage('');
  };

  const handleRemoveQuestion = (questionIndex) => {
    if (interactionLocked) return;
    setGeneratedQuestions((currentQuestions) => currentQuestions.filter((_, index) => index !== questionIndex));
  };

  const handleQuestionTypeChange = (questionIndex, type) => {
    setGeneratedQuestions((currentQuestions) => currentQuestions.map((question, index) => {
      if (index !== questionIndex) return question;

      if (type === 'MCQ') {
        const options = question.options.length >= 2 ? question.options : ['', '', '', ''];
        return { ...question, type, options, correctAnswer: '' };
      }

      if (type === 'True-False') {
        return { ...question, type, options: ['True', 'False'], correctAnswer: 'True' };
      }

      return { ...question, type, options: [], correctAnswer: '' };
    }));
  };

  const handleAddChoice = (questionIndex) => {
    setGeneratedQuestions((currentQuestions) => currentQuestions.map((question, index) => (
      index === questionIndex ? { ...question, options: [...question.options, ''] } : question
    )));
  };

  const handleRemoveChoice = (questionIndex, optionIndex) => {
    setGeneratedQuestions((currentQuestions) => currentQuestions.map((question, index) => {
      if (index !== questionIndex || question.options.length <= 2) return question;

      const removedOption = question.options[optionIndex];
      const options = question.options.filter((_, optionPosition) => optionPosition !== optionIndex);

      return {
        ...question,
        options,
        correctAnswer: question.correctAnswer === removedOption ? '' : question.correctAnswer,
      };
    }));
  };

  const validateQuestionsForSave = () => {
    if (!quizTitle.trim()) return 'Add a quiz title before saving.';
    if (generatedQuestions.length === 0) return 'Generate or add at least one question before saving.';

    for (const [index, question] of generatedQuestions.entries()) {
      const label = `Question ${index + 1}`;
      if (!question.text.trim()) return `${label} needs question text.`;
      if (!question.correctAnswer.trim()) return `${label} needs a correct answer.`;
      if (question.type === 'MCQ') {
        const options = question.options.map((option) => option.trim()).filter(Boolean);
        if (options.length < 2) return `${label} needs at least two answer choices.`;
        if (!options.includes(question.correctAnswer.trim())) return `${label} correct answer must match one of its choices.`;
      }
      if (question.type === 'True-False' && !['True', 'False'].includes(question.correctAnswer)) {
        return `${label} correct answer must be True or False.`;
      }
    }

    return '';
  };

  const handleSave = async () => {
    const validationError = validateQuestionsForSave();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSaving(true);

    const payload = {
      title: quizTitle.trim(),
      description: description.trim(),
      questions: generatedQuestions.map((question) => ({
        text: question.text.trim(),
        type: question.type,
        options: question.type === 'Short-Answer'
          ? []
          : question.options.map((option) => option.trim()).filter(Boolean),
        correctAnswer: question.correctAnswer.trim(),
        difficulty: question.difficulty,
        tags: question.tags || [],
      })),
    };

    try {
      await api.post('/quizzes', payload);
      setStatusMessage('Saved to My Quizzes. Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to save this AI quiz draft.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300 mb-2">
            Quiz Creation Workspace
          </p>
          <h1
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-300 via-cyan-300 to-green-300 bg-clip-text text-transparent"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quiz Generator
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Create quizzes from source documents with AI, or build a quiz manually with full control over every question.
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

      <div className="mb-6 inline-flex w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/40 p-1">
        {[
          { id: 'ai', label: 'AI Generator' },
          { id: 'manual', label: 'Manual Builder' },
        ].map((mode) => (
          <button
            key={mode.id}
            type="button"
            disabled={interactionLocked}
            onClick={() => {
              setCreationMode(mode.id);
              setError('');
              setStatusMessage('');
            }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-all disabled:opacity-50 ${
              creationMode === mode.id
                ? 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {mode.label}
          </button>
        ))}
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

      {creationMode === 'ai' ? (
      <form onSubmit={handleGenerate} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] gap-6">
        <section className="glass-card p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold text-white">Source Documents</h2>
              <p className="mt-1 text-sm text-slate-400">Attach up to five lecture files for text extraction.</p>
            </div>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-950/25 px-3 py-1 text-xs font-bold text-cyan-200">
              PDF / DOCX
            </span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => !interactionLocked && fileInputRef.current?.click()}
            onKeyDown={(event) => {
              if ((event.key === 'Enter' || event.key === ' ') && !interactionLocked) {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!interactionLocked) setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!interactionLocked) setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={handleDrop}
            aria-disabled={interactionLocked}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging
                ? 'border-cyan-300 bg-cyan-950/25'
                : 'border-slate-700 bg-slate-950/20 hover:border-cyan-400/70 hover:bg-slate-950/35'
            } ${interactionLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
          >
            <input
              ref={fileInputRef}
              aria-label="Upload documents"
              type="file"
              accept=".pdf,.docx"
              multiple
              disabled={interactionLocked}
              onChange={(event) => addFiles(event.target.files)}
              className="sr-only"
            />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-950/30 text-cyan-200">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 16V4m0 0L7 9m5-5 5 5M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5" />
              </svg>
            </div>
            <p className="text-base font-bold text-white">Drop files here or click to browse</p>
            <p className="mt-2 text-sm text-slate-400">Only `.pdf` and `.docx` documents are accepted. Each upload is processed in memory.</p>
          </div>

          <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
            <span>{fileSummary}</span>
            <span>{files.length}/5 files attached</span>
          </div>

          {files.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <span
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-700 bg-slate-950/45 px-3 py-1.5 text-xs font-semibold text-slate-200"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFile(index);
                    }}
                    disabled={interactionLocked}
                    aria-label={`Remove ${file.name}`}
                    className="text-slate-500 hover:text-red-300 disabled:opacity-40"
                  >
                    X
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="glass-card gradient-border p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white">AI Parameters</h2>
          <p className="mt-1 text-sm text-slate-400">Control the generated assessment size and target complexity.</p>

          <div className="mt-6 space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="numQuestions" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Number of Questions
                </label>
                <span className="rounded-md border border-slate-700 bg-slate-950/45 px-2 py-1 text-xs font-bold text-white">
                  {clampQuestionCount(numQuestions)}
                </span>
              </div>
              <input
                id="numQuestions"
                type="range"
                min="1"
                max="20"
                value={numQuestions}
                disabled={interactionLocked}
                onChange={(event) => setNumQuestions(clampQuestionCount(event.target.value))}
                className="w-full accent-cyan-400"
              />
              <input
                aria-label="Question count"
                type="number"
                min="1"
                max="20"
                value={numQuestions}
                disabled={interactionLocked}
                onChange={(event) => setNumQuestions(clampQuestionCount(event.target.value))}
                className="mt-3 w-28 rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-400 disabled:opacity-60"
              />
            </div>

            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
                Difficulty
              </span>
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/35 p-1">
                {DIFFICULTIES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    disabled={interactionLocked}
                    onClick={() => setDifficulty(option)}
                    className={`rounded-lg px-3 py-2 text-sm font-bold capitalize transition-all disabled:opacity-50 ${
                      difficulty === option
                        ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={interactionLocked}
              className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.18)] transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {isGenerating ? 'Generating...' : 'Generate AI Quiz'}
            </button>

            {isGenerating && (
              <div role="status" className="rounded-xl border border-cyan-400/25 bg-cyan-950/20 p-4 text-center">
                <svg data-testid="ai-loading-spinner" className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-300" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                <p className="text-sm font-bold text-cyan-100">AI is reading documents and drafting your exam questions...</p>
              </div>
            )}
          </div>
        </section>
      </form>
      ) : (
        <section className="glass-card gradient-border p-6 shadow-xl">
          <div>
            <div>
              <h2 className="text-xl font-bold text-white">Manual Builder</h2>
              <p className="mt-1 text-sm text-slate-400">
                Build questions one by one without using AI.
              </p>
            </div>
          </div>

          {!hasDraftQuestions && (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/20 p-10 text-center">
              <p className="text-sm font-bold text-slate-300">No manual questions yet.</p>
              <p className="mt-1 text-xs text-slate-500">Use Add Question below to start a draft without AI.</p>
            </div>
          )}
        </section>
      )}

      {(hasDraftQuestions || creationMode === 'manual') && (
        <section className="mt-8">
          <div className="mb-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white">
                {creationMode === 'ai' ? 'Generated Quiz Preview' : 'Manual Quiz Draft'}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {creationMode === 'ai'
                  ? 'Review AI output, correct answers, and save when it is classroom-ready.'
                  : 'Add questions, fill the required fields, and save the finished draft.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {creationMode === 'manual' && (
                <button
                  type="button"
                  onClick={handleAddManualQuestion}
                  disabled={interactionLocked}
                  className="rounded-xl border border-cyan-400/40 px-5 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add Question
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={interactionLocked}
                className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_10px_24px_rgba(52,211,153,0.2)] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save to My Quizzes'}
              </button>
            </div>
          </div>

          <div className="glass-card p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
              <div>
                <label htmlFor="quizTitle" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quiz Title
                </label>
                <input
                  id="quizTitle"
                  value={quizTitle}
                  disabled={interactionLocked}
                  onChange={(event) => setQuizTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/45 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
                  placeholder="e.g. Chapter 4 AI Review"
                />
              </div>
              <div>
                <label htmlFor="quizDescription" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Description
                </label>
                <input
                  id="quizDescription"
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
            {generatedQuestions.map((question, questionIndex) => (
              <article key={question.id} className="glass-card p-5 shadow-lg">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400 text-sm font-black text-slate-950">
                      {questionIndex + 1}
                    </span>
                    <select
                      aria-label={`Question ${questionIndex + 1} type`}
                      value={question.type}
                      disabled={interactionLocked}
                      onChange={(event) => handleQuestionTypeChange(questionIndex, event.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-xs font-bold text-white outline-none"
                    >
                      {QUESTION_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Question ${questionIndex + 1} difficulty`}
                      value={question.difficulty}
                      disabled={interactionLocked}
                      onChange={(event) => updateQuestion(questionIndex, { difficulty: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-white outline-none md:w-36"
                    >
                      {DIFFICULTIES.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(questionIndex)}
                      disabled={interactionLocked}
                      aria-label={`Remove question ${questionIndex + 1}`}
                      className="rounded-lg border border-red-500/25 px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-950/25 disabled:opacity-50"
                    >
                      X
                    </button>
                  </div>
                </div>

                <label htmlFor={`question-${question.id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question Text
                </label>
                <textarea
                  id={`question-${question.id}`}
                  value={question.text}
                  disabled={interactionLocked}
                  onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/45 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
                />

                {question.type === 'MCQ' && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Answer Choices</span>
                      <button
                        type="button"
                        onClick={() => handleAddChoice(questionIndex)}
                        disabled={interactionLocked}
                        className="text-xs font-bold text-cyan-300 hover:text-cyan-100 disabled:opacity-50"
                      >
                        Add Choice
                      </button>
                    </div>
                    {question.options.map((option, optionIndex) => (
                      <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-3">
                        <input
                          type="radio"
                          aria-label={`Mark option ${optionIndex + 1} as correct`}
                          name={`correct-${question.id}`}
                          checked={question.correctAnswer === option && option !== ''}
                          disabled={interactionLocked || option.trim() === ''}
                          onChange={() => updateQuestion(questionIndex, { correctAnswer: option })}
                          className="h-4 w-4 accent-emerald-400"
                        />
                        <input
                          aria-label={`Question ${questionIndex + 1} option ${optionIndex + 1}`}
                          value={option}
                          disabled={interactionLocked}
                          onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
                        />
                        {question.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChoice(questionIndex, optionIndex)}
                            disabled={interactionLocked}
                            aria-label={`Remove option ${optionIndex + 1}`}
                            className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:text-red-300 disabled:opacity-50"
                          >
                            X
                          </button>
                        )}
                      </div>
                    ))}
                    <label htmlFor={`answer-${question.id}`} className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Correct Answer
                    </label>
                    <input
                      id={`answer-${question.id}`}
                      value={question.correctAnswer}
                      disabled={interactionLocked}
                      onChange={(event) => updateQuestion(questionIndex, { correctAnswer: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
                    />
                  </div>
                )}

                {question.type === 'True-False' && (
                  <div className="mt-4">
                    <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Correct Answer</span>
                    <div className="flex gap-2">
                      {['True', 'False'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          disabled={interactionLocked}
                          onClick={() => updateQuestion(questionIndex, { correctAnswer: option })}
                          className={`rounded-lg px-4 py-2 text-sm font-bold ${
                            question.correctAnswer === option
                              ? 'bg-emerald-400 text-slate-950'
                              : 'border border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {question.type === 'Short-Answer' && (
                  <div className="mt-4">
                    <label htmlFor={`answer-${question.id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Correct Answer
                    </label>
                    <input
                      id={`answer-${question.id}`}
                      value={question.correctAnswer}
                      disabled={interactionLocked}
                      onChange={(event) => updateQuestion(questionIndex, { correctAnswer: event.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default QuizGenerator;
