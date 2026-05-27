import { QUESTION_TYPES, DIFFICULTIES } from '../utils/quizConstants';

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
}) => {
  return (
    <article key={question.id} className="glass-card p-5 shadow-lg">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400 text-sm font-black text-slate-950">
            {questionIndex + 1}
          </span>
          <select
            aria-label={`Question ${questionIndex + 1} type`}
            value={question.type}
            disabled={disabled}
            onChange={(event) => onTypeChange(questionIndex, event.target.value)}
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
            disabled={disabled}
            onChange={(event) => onUpdate(questionIndex, { difficulty: event.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-white outline-none md:w-36"
          >
            {DIFFICULTIES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onRemove(questionIndex)}
            disabled={disabled}
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
        disabled={disabled}
        onChange={(event) => onUpdate(questionIndex, { text: event.target.value })}
        rows={2}
        className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/45 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
      />

      {question.type === 'MCQ' && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Answer Choices</span>
            <button
              type="button"
              onClick={() => onAddChoice(questionIndex)}
              disabled={disabled}
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
                checked={question.correctAnswerIndex === optionIndex && option !== ''}
                disabled={disabled || option.trim() === ''}
                onChange={() => onUpdate(questionIndex, { correctAnswerIndex: optionIndex, correctAnswer: option })}
                className="h-4 w-4 accent-emerald-400"
              />
              <input
                aria-label={`Question ${questionIndex + 1} option ${optionIndex + 1}`}
                value={option}
                disabled={disabled}
                onChange={(event) => onUpdateOption(questionIndex, optionIndex, event.target.value)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
              />
              {question.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemoveChoice(questionIndex, optionIndex)}
                  disabled={disabled}
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
            disabled={disabled}
            onChange={(event) => {
              const newVal = event.target.value;
              const idx = question.options.indexOf(newVal);
              onUpdate(questionIndex, {
                correctAnswer: newVal,
                correctAnswerIndex: idx >= 0 ? idx : question.correctAnswerIndex,
              });
            }}
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
                disabled={disabled}
                onClick={() => onUpdate(questionIndex, { correctAnswer: option })}
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
            disabled={disabled}
            onChange={(event) => onUpdate(questionIndex, { correctAnswer: event.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-60"
          />
        </div>
      )}
    </article>
  );
};

export default QuestionPreviewCard;
