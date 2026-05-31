import { useState } from 'react';
import { QUESTION_TYPES, DIFFICULTIES } from '../utils/quizConstants';

const getTypeClass = (type) => {
  switch (type) {
    case 'MCQ':
      return 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-400/25';
    case 'True-False':
      return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-400/25';
    case 'Short-Answer':
      return 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 border-cyan-400/25';
    default:
      return 'bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300 border-slate-400/25';
  }
};

const getDifficultyClass = (difficulty) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-400/25';
    case 'medium':
      return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-400/25';
    case 'hard':
      return 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-400/25';
    default:
      return 'bg-slate-50 dark:bg-slate-950/30 text-slate-700 dark:text-slate-300 border-slate-400/25';
  }
};

const QuestionPreviewCard = ({
  question,
  questionIndex,
  onUpdate,
  onUpdateOption,
  onTypeChange,
  onAddChoice,
  onRemoveChoice,
  onRemove,
  disabled,
  isCollapsed = false,
  onToggleCollapse,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}) => {
  const [tagInput, setTagInput] = useState('');

  const getValidationError = () => {
    if (!question.text.trim()) return 'Question text is empty';
    if (question.type === 'MCQ') {
      const activeOptions = (question.options || []).map((o) => o.trim()).filter(Boolean);
      if (activeOptions.length < 2) return 'Needs at least 2 choices';
      if (
        question.correctAnswerIndex < 0 ||
        question.correctAnswerIndex >= question.options.length ||
        !question.options[question.correctAnswerIndex]?.trim()
      ) {
        return 'Select a correct answer';
      }
    } else {
      if (!question.correctAnswer.trim()) return 'Correct answer is empty';
      if (question.type === 'True-False' && !['True', 'False'].includes(question.correctAnswer)) {
        return 'Must be True or False';
      }
    }
    return null;
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    const current = Array.isArray(question.tags) ? question.tags : [];
    if (!current.includes(tag)) {
      onUpdate(questionIndex, { tags: [...current, tag] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    const current = Array.isArray(question.tags) ? question.tags : [];
    onUpdate(questionIndex, { tags: current.filter((t) => t !== tag) });
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const tags = Array.isArray(question.tags) ? question.tags : [];
  const errorText = getValidationError();

  if (isCollapsed) {
    return (
      <article
        id={`question-card-${questionIndex}`}
        className={`glass-card p-4 transition-all hover:bg-slate-100/50 dark:hover:bg-slate-900/35 border-l-4 ${
          errorText ? 'border-l-amber-500 border-amber-500/20' : 'border-l-cyan-400 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400 text-xs font-black text-slate-950">
              {questionIndex + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {question.text || <span className="text-slate-400 italic">No question text provided yet</span>}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTypeClass(question.type)}`}>
                  {question.type}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getDifficultyClass(question.difficulty)}`}>
                  {question.difficulty}
                </span>
                {errorText && (
                  <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
                    ⚠️ {errorText}
                  </span>
                )}
                {!errorText && (
                  <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    ✓ Valid
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 self-end md:self-auto">
            <button
              type="button"
              disabled={disabled || isFirst}
              onClick={onMoveUp}
              title="Move Up"
              aria-label="Move Up"
              className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={disabled || isLast}
              onClick={onMoveDown}
              title="Move Down"
              aria-label="Move Down"
              className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              ▼
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleCollapse}
              className="px-3 py-1 text-xs font-bold rounded-lg border border-cyan-400/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 transition-all"
            >
              Expand
            </button>
            <button
              type="button"
              onClick={() => onRemove(questionIndex)}
              disabled={disabled}
              title="Delete Question"
              aria-label="Delete Question"
              className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 font-bold transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      id={`question-card-${questionIndex}`}
      className={`glass-card p-5 shadow-lg border-l-4 transition-all duration-200 ${
        errorText ? 'border-l-amber-500 border-amber-500/20' : 'border-l-cyan-400 border-cyan-400/10'
      }`}
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400 text-sm font-black text-slate-950">
            {questionIndex + 1}
          </span>
          <div className="flex gap-0.5 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-950/45 px-1 py-0.5">
            <button
              type="button"
              disabled={disabled || isFirst}
              onClick={onMoveUp}
              title="Move Up"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={disabled || isLast}
              onClick={onMoveDown}
              title="Move Down"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              ▼
            </button>
          </div>
          <select
            aria-label={`Question ${questionIndex + 1} type`}
            value={question.type}
            disabled={disabled}
            onChange={(event) => onTypeChange(questionIndex, event.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-3 py-2 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-cyan-400"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label={`Question ${questionIndex + 1} difficulty`}
            value={question.difficulty}
            disabled={disabled}
            onChange={(event) => onUpdate(questionIndex, { difficulty: event.target.value })}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-white outline-none md:w-36 focus:border-cyan-400"
          >
            {DIFFICULTIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled}
            onClick={onToggleCollapse}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Collapse
          </button>
          <button
            type="button"
            onClick={() => onRemove(questionIndex)}
            disabled={disabled}
            aria-label={`Remove question ${questionIndex + 1}`}
            className="rounded-lg border border-red-500/25 px-3 py-2 text-sm font-bold text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/25 disabled:opacity-50 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {errorText && (
        <div className="mb-4 px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-50 dark:bg-amber-950/20 text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
          ⚠️ Attention required: {errorText}
        </div>
      )}

      <label htmlFor={`question-${question.id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        Question Text
      </label>
      <textarea
        id={`question-${question.id}`}
        value={question.text}
        disabled={disabled}
        onChange={(event) => onUpdate(questionIndex, { text: event.target.value })}
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-4 py-3 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-all"
      />

      {question.type === 'MCQ' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Answer Choices</span>
            <button
              type="button"
              onClick={() => onAddChoice(questionIndex)}
              disabled={disabled}
              className="text-xs font-bold text-cyan-700 dark:text-cyan-300 hover:text-cyan-900 dark:hover:text-cyan-100 disabled:opacity-50 transition-colors"
            >
              + Add Choice
            </button>
          </div>
          {question.options.map((option, optionIndex) => (
            <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-3">
              <input
                type="radio"
                aria-label={`Mark option ${optionIndex + 1} as correct`}
                name={`correct-${question.id}`}
                checked={question.correctAnswerIndex === optionIndex && option !== ''}
                disabled={disabled || option.trim() === ''}
                onChange={() => onUpdate(questionIndex, { correctAnswerIndex: optionIndex, correctAnswer: option })}
                className="h-4 w-4 accent-emerald-400 cursor-pointer"
              />
              <input
                aria-label={`Question ${questionIndex + 1} option ${optionIndex + 1}`}
                value={option}
                disabled={disabled}
                onChange={(event) => onUpdateOption(questionIndex, optionIndex, event.target.value)}
                placeholder={`Option ${optionIndex + 1}`}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-all"
              />
              {question.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemoveChoice(questionIndex, optionIndex)}
                  disabled={disabled}
                  aria-label={`Remove option ${optionIndex + 1}`}
                  className="rounded-lg px-2 py-1 text-sm font-bold text-slate-500 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <label htmlFor={`answer-${question.id}`} className="mt-3 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Correct Answer
          </label>
          <input
            id={`answer-${question.id}`}
            value={question.correctAnswer}
            disabled={disabled}
            onChange={(event) => {
              const newVal = event.target.value;
              const idx = question.options.indexOf(newVal);
              onUpdate(questionIndex, {
                correctAnswer: newVal,
                correctAnswerIndex: idx >= 0 ? idx : question.correctAnswerIndex,
              });
            }}
            placeholder="Matches correct answer option"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-all"
          />
        </div>
      )}

      {question.type === 'True-False' && (
        <div className="mt-4">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Correct Answer</span>
          <div className="flex gap-2">
            {['True', 'False'].map((option) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onUpdate(questionIndex, { correctAnswer: option })}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  question.correctAnswer === option
                    ? 'bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                    : 'border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
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
          <label htmlFor={`answer-${question.id}`} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Correct Answer
          </label>
          <input
            id={`answer-${question.id}`}
            value={question.correctAnswer}
            disabled={disabled}
            onChange={(event) => onUpdate(questionIndex, { correctAnswer: event.target.value })}
            placeholder="Type correct answer"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-all"
          />
        </div>
      )}

      {/* Tags */}
      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            value={tagInput}
            disabled={disabled}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add a tag..."
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-3 py-2 text-sm text-slate-800 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 transition-all"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={disabled || !tagInput.trim()}
            className="rounded-lg border border-cyan-400/40 px-4 py-2 text-xs font-bold text-cyan-700 dark:text-cyan-200 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 disabled:opacity-50 transition-all"
          >
            Add Tag
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-400/20 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={disabled}
                  className="text-cyan-400 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-50 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export default QuestionPreviewCard;
