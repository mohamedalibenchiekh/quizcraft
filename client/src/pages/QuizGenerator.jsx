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
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);

  const interactionLocked = isGenerating || isSaving;
  const hasDraftQuestions = generatedQuestions.length > 0;

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
      <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 py-4 px-6 mb-6 flex items-center justify-between shadow-lg rounded-xl">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white max-w-xs truncate">{quizTitle || 'New AI Quiz'}</h1>
          {hasDraftQuestions && (
            <span className="bg-slate-800 text-cyan-400 text-xs px-2.5 py-1 rounded-full border border-slate-700/60 font-medium">
              {generatedQuestions.length} Questions
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            disabled={interactionLocked}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-cyan-400 disabled:opacity-50"
          >
            Cancel
          </button>
          {hasDraftQuestions && (
            <button
              type="button"
              onClick={handleSave}
              disabled={interactionLocked}
              className="rounded-xl bg-emerald-400 px-5 py-2 text-sm font-black text-slate-950 shadow-[0_10px_24px_rgba(52,211,153,0.2)] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save Quiz'}
            </button>
          )}
        </div>
      </div>

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
        <div role="alert" className="mb-6 rounded-xl border border-red-500/35 bg-red-50 dark:bg-red-950/25 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
          {statusMessage}
        </div>
      )}

      {creationMode === 'ai' ? (
      <form onSubmit={handleGenerate} className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] gap-6">
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
      ) : (
        <section className="glass-card gradient-border p-6 shadow-xl">
          <div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Manual Builder</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Build questions one by one without using AI.
              </p>
            </div>
          </div>

          {!hasDraftQuestions && (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/20 p-10 text-center">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No manual questions yet.</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Use Add Question below to start a draft without AI.</p>
            </div>
          )}
        </section>
      )}

      {(hasDraftQuestions || creationMode === 'manual') && (
        <section className="mt-8">
          <div className="mb-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                {creationMode === 'ai' ? 'Generated Quiz Preview' : 'Manual Quiz Draft'}
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {creationMode === 'ai'
                  ? 'Review AI output, correct answers, and save when it is classroom-ready.'
                  : 'Add questions, fill the required fields, and save the finished draft.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {hasDraftQuestions && (
                <button
                  type="button"
                  onClick={() => setIsAllCollapsed((prev) => !prev)}
                  className="rounded-xl border border-slate-600/40 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800/50 transition-colors"
                >
                  <svg className="w-4 h-4 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={isAllCollapsed ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                  </svg>
                  {isAllCollapsed ? 'Expand All' : 'Collapse All Details'}
                </button>
              )}
              {creationMode === 'manual' && (
                <button
                  type="button"
                  onClick={onAddQuestion}
                  disabled={interactionLocked}
                  className="rounded-xl border border-cyan-400/40 px-5 py-3 text-sm font-bold text-cyan-700 dark:text-cyan-100 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add Question
                </button>
              )}
            </div>
          </div>

          <div className="glass-card p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
              <div>
                <label htmlFor="quizTitle" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Quiz Title
                </label>
                <input
                  id="quizTitle"
                  value={quizTitle}
                  disabled={interactionLocked}
                  onChange={(event) => setQuizTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60"
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
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60"
                  placeholder="Optional student-facing context"
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {generatedQuestions.map((question, questionIndex) => (
              <QuestionPreviewCard
                key={question.id}
                elementId={`question-card-${question.id || questionIndex}`}
                isCollapsed={isAllCollapsed}
                question={question}
                questionIndex={questionIndex}
                onUpdate={updateQuestion}
                onUpdateOption={updateOption}
                onTypeChange={handleQuestionTypeChange}
                onAddChoice={handleAddChoice}
                onRemoveChoice={handleRemoveChoice}
                onRemove={onRemoveQuestion}
                disabled={interactionLocked}
              />
            ))}
          </div>
        </section>
      )}
      {hasDraftQuestions && generatedQuestions.length > 3 && (
        <nav className="fixed right-6 top-32 hidden xl:flex flex-col gap-2 bg-slate-900/60 backdrop-blur border border-slate-800 p-3 rounded-2xl shadow-xl max-h-[60vh] overflow-y-auto custom-scrollbar">
          {generatedQuestions.map((question, i) => (
            <button
              key={question.id || i}
              type="button"
              onClick={() => {
                document.getElementById(`question-card-${question.id || i}`)?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
              }}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-600 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              {i + 1}
            </button>
          ))}
        </nav>
      )}
    </main>
  );
};

export default QuizGenerator;
