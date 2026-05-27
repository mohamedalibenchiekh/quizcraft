import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import FileDropzone from '../components/FileDropzone';
import AIParameterForm from '../components/AIParameterForm';
import QuestionPreviewCard from '../components/QuestionPreviewCard';
import {
  DIFFICULTIES,
  MAX_FILES,
  clampQuestionCount,
  createBlankQuestion,
  normalizeQuestion,
} from '../utils/quizConstants';

const QuizGenerator = () => {
  const navigate = useNavigate();

  const [creationMode, setCreationMode] = useState('ai');
  const [files, setFiles] = useState([]);
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
      options[optionIndex] = value;
      return { ...question, options };
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
        return { ...question, type, options, correctAnswer: '', correctAnswerIndex: -1 };
      }

      if (type === 'True-False') {
        return { ...question, type, options: ['True', 'False'], correctAnswer: 'True', correctAnswerIndex: 0 };
      }

      return { ...question, type, options: [], correctAnswer: '', correctAnswerIndex: -1 };
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

  const validateQuestionsForSave = () => {
    if (!quizTitle.trim()) return 'Add a quiz title before saving.';
    if (generatedQuestions.length === 0) return 'Generate or add at least one question before saving.';

    for (const [index, question] of generatedQuestions.entries()) {
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
      questions: generatedQuestions.map((question) => {
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
        />
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
      )}
    </main>
  );
};

export default QuizGenerator;
