import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FileDropzone from '../components/FileDropzone';
import AIParameterForm from '../components/AIParameterForm';
import QuestionPreviewCard from '../components/QuestionPreviewCard';
import useQuizForm from '../hooks/useQuizForm';
import {
  MAX_FILES,
  clampQuestionCount,
  normalizeQuestion,
} from '../utils/quizConstants';

const QuizGenerator = () => {
  const navigate = useNavigate();

  const {
    questions: generatedQuestions,
    setQuestions: setGeneratedQuestions,
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
  } = useQuizForm([]);

  const [creationMode, setCreationMode] = useState('ai');
  const [files, setFiles] = useState([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [quizTitle, setQuizTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [matrix, setMatrix] = useState({
    "MCQ": { easy: 0, medium: 0, hard: 0 },
    "True-False": { easy: 0, medium: 0, hard: 0 },
    "Short-Answer": { easy: 0, medium: 0, hard: 0 },
  });
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // High-Fidelity UX states
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');

  const interactionLocked = isGenerating || isSaving;
  const hasDraftQuestions = generatedQuestions.length > 0;

  // Toggle Collapse / Expand
  const toggleCollapse = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => setCollapsedIds(new Set());
  const collapseAll = () => setCollapsedIds(new Set(generatedQuestions.map((q) => q.id)));

  // Scroll to question helper with focus animation
  const scrollToQuestion = (index, id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
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

  // Reorder questions handler
  const handleMoveQuestion = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === generatedQuestions.length - 1) return;

    const nextQuestions = [...generatedQuestions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = nextQuestions[index];
    nextQuestions[index] = nextQuestions[targetIndex];
    nextQuestions[targetIndex] = temp;

    setGeneratedQuestions(nextQuestions);
  };

  // Bulk Actions
  const handleBulkDifficulty = (diff) => {
    setGeneratedQuestions((prev) => prev.map((q) => ({ ...q, difficulty: diff })));
    setStatusMessage(`Applied ${diff} difficulty to all questions.`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleBulkAddTag = () => {
    const cleanTag = bulkTagInput.trim();
    if (!cleanTag) return;

    setGeneratedQuestions((prev) =>
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
    setGeneratedQuestions((prev) => prev.map((q) => ({ ...q, tags: [] })));
    setStatusMessage('Cleared all question tags.');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Live Telemetry Calculations
  const difficultyCounts = generatedQuestions.reduce(
    (acc, q) => {
      acc[q.difficulty || 'medium'] = (acc[q.difficulty || 'medium'] || 0) + 1;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0 }
  );

  const typeCounts = generatedQuestions.reduce(
    (acc, q) => {
      acc[q.type || 'MCQ'] = (acc[q.type || 'MCQ'] || 0) + 1;
      return acc;
    },
    { MCQ: 0, 'True-False': 0, 'Short-Answer': 0 }
  );

  const estimatedTimeMinutes = Math.ceil(
    generatedQuestions.reduce((sum, q) => {
      if (q.type === 'MCQ') return sum + 60;
      if (q.type === 'True-False') return sum + 30;
      if (q.type === 'Short-Answer') return sum + 90;
      return sum + 60;
    }, 0) / 60
  );

  const handleAddFiles = (incomingFiles, fileError) => {
    if (interactionLocked) return;
    if (fileError) {
      setError(fileError);
      return;
    }
    setError('');

    if (incomingFiles.length === 0) return;

    setFiles((currentFiles) => {
      const merged = [...currentFiles];
      incomingFiles.forEach((file) => {
        const duplicate = merged.some(
          (existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified
        );
        if (!duplicate && merged.length < MAX_FILES) {
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

  const handleToggleAdvanced = () => {
    setIsAdvanced((prev) => !prev);
    setError('');
    setStatusMessage('');
  };

  const handleMatrixCellChange = (type, difficulty, value) => {
    const clamped = Math.min(20, Math.max(0, parseInt(value, 10) || 0));
    setMatrix((prev) => ({
      ...prev,
      [type]: { ...prev[type], [difficulty]: clamped },
    }));
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

    if (isAdvanced) {
      const total = Object.values(matrix).reduce(
        (s, d) => s + d.easy + d.medium + d.hard, 0
      );
      if (total === 0) {
        setError('Set at least one question in the advanced parameters matrix.');
        setIsGenerating(false);
        return;
      }
      formData.append('isAdvanced', 'true');
      formData.append('matrix', JSON.stringify(matrix));
      formData.append('numQuestions', String(total));
    } else {
      formData.append('numQuestions', String(clampQuestionCount(numQuestions)));
    }
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

      setQuizTitle(payload.title || "");
      setDescription(payload.description || "");
      setTags(Array.isArray(payload.tags) ? payload.tags : ["AI Generated", "Gemini"]);
      setGeneratedQuestions(questions.map((question, index) => normalizeQuestion(question, index, difficulty)));
      setStatusMessage(`${questions.length} AI question${questions.length === 1 ? '' : 's'} ready for review.`);
      // Start all expanded
      setCollapsedIds(new Set());
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'AI generation failed. Please verify your documents and try again.');
      setGeneratedQuestions([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const onAddQuestion = () => {
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
    const validationError = validateQuestions(quizTitle, generatedQuestions);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSaving(true);

    const payload = {
      title: quizTitle.trim(),
      description: description.trim(),
      tags,
      questions: buildQuestionPayload(generatedQuestions),
    };

    try {
      await api.post('/quizzes', payload);
      setStatusMessage('Saved to My Quizzes. Redirecting to dashboard...');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Unable to save this quiz draft.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300 mb-2">
            Quiz Creation Workspace
          </p>
          <h1
            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-cyan-600 to-green-600 dark:from-violet-300 dark:via-cyan-300 dark:to-green-300 bg-clip-text text-transparent"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Quiz Generator
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Create quizzes from source documents with AI, or build a quiz manually with full control over every question.
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

      <div className="mb-6 inline-flex w-full max-w-md rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950/40 p-1">
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
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-500/35 bg-red-50 dark:bg-red-950/25 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-200 animate-pulse">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          {statusMessage}
        </div>
      )}

      {creationMode === 'ai' && (
        <form onSubmit={handleGenerate} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] gap-6 mb-8">
          <FileDropzone
            files={files}
            onAddFiles={handleAddFiles}
            onRemoveFile={removeFile}
            disabled={interactionLocked}
          />
          <AIParameterForm
            numQuestions={numQuestions}
            difficulty={difficulty}
            onNumQuestionsChange={(v) => setNumQuestions(clampQuestionCount(v))}
            onDifficultyChange={setDifficulty}
            isGenerating={isGenerating}
            isSaving={isSaving}
            isAdvanced={isAdvanced}
            matrix={matrix}
            onToggleAdvanced={handleToggleAdvanced}
            onMatrixCellChange={handleMatrixCellChange}
          />
        </form>
      )}

      {creationMode === 'manual' && !hasDraftQuestions && (
        <section className="glass-card gradient-border p-6 shadow-xl text-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Manual Builder</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Build questions one by one without using AI.
            </p>
          </div>
          <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/20 p-10">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No manual questions yet.</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 mb-4">Click below to start drafting your quiz from scratch.</p>
            <button
              type="button"
              onClick={onAddQuestion}
              disabled={interactionLocked}
              className="rounded-xl bg-cyan-400 px-6 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.25)]"
            >
              Add Question
            </button>
          </div>
        </section>
      )}

      {hasDraftQuestions && (
        <section className="mt-8 border-t border-slate-200 dark:border-slate-800 pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-6 items-start">
            
            {/* STICKY CONTROL SIDEBAR */}
            <aside className="lg:sticky lg:top-6 space-y-6">
              {/* Telemetry Panel */}
              <div className="glass-card p-5 border border-slate-300 dark:border-slate-700 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
                  <span>Quiz Metrics</span>
                  <span className="bg-cyan-400/20 text-cyan-700 dark:text-cyan-300 text-[10px] font-black px-2 py-0.5 rounded">
                    Draft
                  </span>
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Total Items:</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-100">{generatedQuestions.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Est. Duration:</span>
                    <span className="font-extrabold text-cyan-600 dark:text-cyan-300 flex items-center gap-1">
                      ⏱️ ~{estimatedTimeMinutes} min
                    </span>
                  </div>

                  {/* Difficulty breakdown */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-2">Difficulty Distribution</span>
                    <div className="flex gap-1.5">
                      {Object.entries(difficultyCounts).map(([diff, count]) => (
                        <div key={diff} className="flex-1 text-center bg-slate-50 dark:bg-slate-900/40 rounded-lg py-1.5 border border-slate-200 dark:border-slate-800/80">
                          <div className="text-[9px] uppercase font-bold text-slate-500">{diff}</div>
                          <div className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Question type breakdown */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">Question Types</span>
                    {Object.entries(typeCounts).map(([type, count]) => {
                      const percentage = generatedQuestions.length > 0 ? (count / generatedQuestions.length) * 100 : 0;
                      return (
                        <div key={type} className="text-xs">
                          <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                            <span>{type === 'True-False' ? 'True/False' : type === 'Short-Answer' ? 'Short Answer' : type}</span>
                            <span>{count}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-900 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                type === 'MCQ' ? 'bg-violet-500' : type === 'True-False' ? 'bg-emerald-500' : 'bg-cyan-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bulk Actions Panel */}
              <div className="glass-card p-5 border border-slate-300 dark:border-slate-700 shadow-md">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Bulk Operations
                </h3>
                <div className="space-y-3.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">Set Difficulty for All:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {['easy', 'medium', 'hard'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleBulkDifficulty(d)}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900/60 hover:bg-cyan-400/20 border border-slate-300 dark:border-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors uppercase"
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="bulkTagInput" className="text-[10px] font-bold text-slate-500 block mb-1">Tag All Questions:</label>
                    <div className="flex gap-1.5">
                      <input
                        id="bulkTagInput"
                        value={bulkTagInput}
                        onChange={(e) => setBulkTagInput(e.target.value)}
                        placeholder="Tag name"
                        className="flex-1 rounded border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/60 px-2 py-1 text-xs text-slate-800 dark:text-white outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={handleBulkAddTag}
                        className="px-3 py-1 rounded bg-cyan-400 text-slate-950 font-bold text-xs hover:bg-cyan-300 transition-colors shrink-0"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBulkClearTags}
                    className="w-full text-center py-1.5 rounded border border-red-500/25 text-red-500 dark:text-red-400 bg-red-50/10 hover:bg-red-50/20 text-xs font-bold transition-colors"
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
                  <div className="flex gap-2">
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
                
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {generatedQuestions.map((q, index) => {
                    const isCollapsed = collapsedIds.has(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => scrollToQuestion(index, q.id)}
                        className="group flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-100/40 dark:bg-slate-900/20 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors border border-transparent hover:border-cyan-400/20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-300">
                            {index + 1}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase bg-slate-200/50 dark:bg-slate-800/30 px-1 rounded text-slate-600 dark:text-slate-400 shrink-0">
                            {q.type === 'True-False' ? 'TF' : q.type === 'Short-Answer' ? 'SA' : 'MCQ'}
                          </span>
                          <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                            {q.text || <span className="italic text-slate-400">Empty question</span>}
                          </span>
                        </div>
                        
                        <div className="flex items-center shrink-0 opacity-40 group-hover:opacity-100 gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveQuestion(index, 'up');
                            }}
                            className="p-0.5 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={index === generatedQuestions.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveQuestion(index, 'down');
                            }}
                            className="p-0.5 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 disabled:opacity-30"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveQuestion(index);
                            }}
                            className="p-0.5 hover:bg-red-200/40 hover:text-red-500 rounded text-slate-600 dark:text-slate-400"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* MAIN EDITING WORKSPACE */}
            <div className="space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-100/50 dark:bg-slate-900/10 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                    {creationMode === 'ai' ? 'Review AI Draft' : 'Manual Quiz Draft'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {creationMode === 'ai'
                      ? 'Inspect AI generated questions, make edits, and save when classroom-ready.'
                      : 'Fill in details, select types, set correct answers, and save your draft.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {creationMode === 'manual' && (
                    <button
                      type="button"
                      onClick={onAddQuestion}
                      disabled={interactionLocked}
                      className="rounded-xl border border-cyan-400/40 px-4 py-2.5 text-sm font-bold text-cyan-700 dark:text-cyan-100 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                    >
                      + Add Question
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={interactionLocked}
                    className="rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-slate-950 shadow-[0_8px_20px_rgba(52,211,153,0.25)] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save to My Quizzes'}
                  </button>
                </div>
              </div>

              {/* Title & Description Inputs */}
              <div className="glass-card p-5 border border-slate-300 dark:border-slate-700 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
                  <div>
                    <label htmlFor="quizTitle" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Quiz Title
                    </label>
                    <input
                      id="quizTitle"
                      value={quizTitle}
                      disabled={interactionLocked}
                      onChange={(event) => setQuizTitle(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-colors"
                      placeholder="e.g. Chapter 4 AI Review"
                    />
                  </div>
                  <div>
                    <label htmlFor="quizDescription" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Description
                    </label>
                    <input
                      id="quizDescription"
                      value={description}
                      disabled={interactionLocked}
                      onChange={(event) => setDescription(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-colors"
                      placeholder="Optional student-facing context"
                    />
                  </div>
                </div>
              </div>

              {/* Question Preview Cards List */}
              <div className="space-y-5">
                {generatedQuestions.map((question, questionIndex) => (
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
                    isLast={questionIndex === generatedQuestions.length - 1}
                  />
                ))}
              </div>
            </div>

          </div>
        </section>
      )}
    </main>
  );
};

export default QuizGenerator;
