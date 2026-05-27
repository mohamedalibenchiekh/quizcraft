import { DIFFICULTIES, clampQuestionCount } from '../utils/quizConstants';

const AIParameterForm = ({ numQuestions, difficulty, onNumQuestionsChange, onDifficultyChange, isGenerating, isSaving, onSubmit }) => {
  const interactionLocked = isGenerating || isSaving;

  return (
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
            onChange={(event) => onNumQuestionsChange(event.target.value)}
            className="w-full accent-cyan-400"
          />
          <input
            aria-label="Question count"
            type="number"
            min="1"
            max="20"
            value={numQuestions}
            disabled={interactionLocked}
            onChange={(event) => onNumQuestionsChange(event.target.value)}
            className="mt-3 w-28 rounded-lg border border-slate-700 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-cyan-400 disabled:opacity-60"
          />
        </div>

        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">Difficulty</span>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/35 p-1">
            {DIFFICULTIES.map((option) => (
              <button
                key={option}
                type="button"
                disabled={interactionLocked}
                onClick={() => onDifficultyChange(option)}
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
          onClick={onSubmit}
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
  );
};

export default AIParameterForm;
