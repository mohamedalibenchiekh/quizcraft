import { DIFFICULTIES, clampQuestionCount, QUESTION_TYPES } from '../utils/quizConstants';

const TOTAL_LABEL = { "MCQ": "MCQ", "True-False": "True/False", "Short-Answer": "Short Answer" };

const matrixTotal = (matrix) =>
  Object.values(matrix).reduce((s, d) => s + d.easy + d.medium + d.hard, 0);

const AIParameterForm = ({
  numQuestions,
  difficulty,
  onNumQuestionsChange,
  onDifficultyChange,
  isGenerating,
  isSaving,
  onSubmit,
  isAdvanced,
  matrix,
  onToggleAdvanced,
  onMatrixCellChange,
  customPrompt,
  onCustomPromptChange,
}) => {
  const interactionLocked = isGenerating || isSaving;

  return (
    <section className="glass-card gradient-border p-6 shadow-xl">
      <h2 className="text-xl font-bold text-slate-800 dark:text-white">AI Parameters</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Control the generated assessment size and target complexity.</p>

      <div className="mt-6 space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="numQuestions" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Number of Questions
            </label>
            <span className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-2 py-1 text-xs font-bold text-slate-800 dark:text-white">
              {isAdvanced ? matrixTotal(matrix) : clampQuestionCount(numQuestions)}
            </span>
          </div>
          <input
            id="numQuestions"
            type="range"
            min="1"
            max="20"
            value={numQuestions}
            disabled={interactionLocked || isAdvanced}
            onChange={(event) => onNumQuestionsChange(event.target.value)}
            className="w-full accent-cyan-400"
          />
          <input
            aria-label="Question count"
            type="number"
            min="1"
            max="20"
            value={numQuestions}
            disabled={interactionLocked || isAdvanced}
            onChange={(event) => onNumQuestionsChange(event.target.value)}
            className="mt-3 w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-3 py-2 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60"
          />
        </div>

        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Difficulty</span>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/35 p-1">
            {DIFFICULTIES.map((option) => (
              <button
                key={option}
                type="button"
                disabled={interactionLocked || isAdvanced}
                onClick={() => onDifficultyChange(option)}
                className={`rounded-lg px-3 py-2 text-sm font-bold capitalize transition-all disabled:opacity-50 ${
                  difficulty === option
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="customPrompt" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Custom AI Instructions / Topic Focus (Optional)
          </label>
          <textarea
            id="customPrompt"
            rows={3}
            maxLength={2000}
            value={customPrompt}
            disabled={interactionLocked}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-60 placeholder:text-slate-500 transition-colors resize-none"
            placeholder="e.g., Focus heavily on chapter 4, avoid complex calculus formulas, or format text emphasizing medical case terminology..."
          />
        </div>

        <button
          type="button"
          onClick={onToggleAdvanced}
          disabled={interactionLocked}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-all disabled:opacity-50"
        >
          <span className={`inline-block transition-transform duration-200 ${isAdvanced ? 'rotate-90' : ''}`}>
            ▸
          </span>
          {isAdvanced ? 'Hide' : 'Show'} Advanced Parameters
        </button>

        {isAdvanced && (
          <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/45 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Questions per Type × Difficulty
            </p>
            <div className="grid grid-cols-4 gap-x-2 gap-y-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              <div className="text-left pl-1" />
              <div>Easy</div>
              <div>Medium</div>
              <div>Hard</div>

              {QUESTION_TYPES.map((type) => (
                <div key={type} className="contents">
                  <div className="flex items-center text-left text-sm font-semibold text-slate-700 dark:text-slate-300 pl-1">
                    {TOTAL_LABEL[type]}
                  </div>
                  {["easy", "medium", "hard"].map((diff) => (
                    <input
                      key={diff}
                      type="number"
                      min="0"
                      max="20"
                      value={matrix[type][diff]}
                      disabled={interactionLocked}
                      onChange={(e) => onMatrixCellChange(type, diff, e.target.value)}
                      className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/60 px-1 py-1.5 text-sm font-semibold text-center text-slate-800 dark:text-white outline-none focus:border-cyan-400 disabled:opacity-50"
                    />
                  ))}
                </div>
              ))}

              <div className="flex items-center text-left text-xs font-bold text-slate-700 dark:text-slate-300 pl-1">
                Totals
              </div>
              {["easy", "medium", "hard"].map((diff) => (
                <div
                  key={diff}
                  className="rounded-md bg-cyan-50 dark:bg-cyan-950/30 px-1 py-1.5 text-sm font-bold text-cyan-700 dark:text-cyan-300"
                >
                  {QUESTION_TYPES.reduce((s, t) => s + (matrix[t][diff] || 0), 0)}
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-center">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Questions:{' '}
              </span>
              <span className="text-lg font-extrabold text-cyan-700 dark:text-cyan-300">
                {matrixTotal(matrix)}
              </span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={interactionLocked}
          onClick={onSubmit}
          className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-400 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.18)] transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-65"
        >
          {isGenerating ? 'Generating...' : 'Generate AI Quiz'}
        </button>

        {isGenerating && (
          <div role="status" className="rounded-xl border border-cyan-400/25 bg-cyan-50 dark:bg-cyan-950/20 p-4 text-center">
            <svg data-testid="ai-loading-spinner" className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-700 dark:text-cyan-300" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
            <p className="text-sm font-bold text-cyan-700 dark:text-cyan-100">AI is reading documents and drafting your exam questions...</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AIParameterForm;
