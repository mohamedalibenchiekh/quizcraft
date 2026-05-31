import React from 'react';

const OPTION_COLORS = [
  { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', accent: '#f87171' },
  { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', accent: '#60a5fa' },
  { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', accent: '#fbbf24' },
  { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', accent: '#4ade80' },
];

const ActiveQuizEngine = ({
  quiz,
  answers,
  error,
  submitting,
  allAnswered,
  onSelectOption,
  onShortAnswerChange,
  onSubmit,
  submitLabel = 'Submit Assessment',
}) => (
  <div className="w-full max-w-3xl mx-auto" data-testid="active-quiz-engine">
    <div className="glass-card p-6 mb-6">
      <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
        {quiz?.title}
      </h1>
      {quiz?.description && (
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{quiz.description}</p>
      )}
      <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
        {quiz?.questions?.length || 0} questions
      </p>
    </div>

    {error && (
      <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-sm">{error}</div>
    )}

    <div className="space-y-6 mb-8">
      {quiz?.questions.map((question, qIdx) => (
        <div key={question._id} className="glass-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-brand-300)' }}>
              {qIdx + 1}
            </span>
            <div className="flex-1">
              <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {question.text}
              </p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.08)', color: 'var(--color-text-muted)' }}>
                {question.difficulty} &middot; {question.type}
              </span>
            </div>
          </div>

          {['MCQ', 'True-False'].includes(question.type) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {question.options.map((option, oIdx) => {
                const colors = OPTION_COLORS[oIdx % OPTION_COLORS.length];
                const isSelected = answers[question._id] === option;
                return (
                  <button
                    key={option}
                    onClick={() => onSelectOption(question._id, option)}
                    className="relative px-4 py-3.5 rounded-2xl text-left font-semibold text-sm transition-all duration-200 cursor-pointer"
                    style={{
                      background: isSelected ? colors.border : colors.bg,
                      border: `2px solid ${isSelected ? colors.accent : colors.border}`,
                      color: 'var(--color-text-primary)',
                      transform: isSelected ? 'scale(0.97)' : undefined,
                    }}
                  >
                    <span className="mr-2 inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-extrabold" style={{ background: colors.border, color: colors.accent }}>
                      {String.fromCharCode(65 + oIdx)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'Short-Answer' && (
            <textarea
              className="w-full p-4 rounded-xl outline-none transition-all duration-200 focus:ring-2 resize-none"
              style={{
                background: 'var(--color-surface-input)',
                color: 'var(--color-text-primary)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                caretColor: 'var(--color-brand-400)',
              }}
              placeholder="Type your answer here..."
              rows={3}
              value={answers[question._id] || ''}
              onChange={(e) => onShortAnswerChange(question._id, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>

    <div className="glass-card p-6 text-center">
      <button
        onClick={onSubmit}
        disabled={!allAnswered || submitting}
        className="px-10 py-3.5 rounded-xl text-base font-extrabold text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px]"
        style={{
          background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
          boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
          fontFamily: 'var(--font-display)',
        }}
      >
        {submitting ? 'Submitting...' : submitLabel}
      </button>
      {!allAnswered && (
        <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
          Answer all questions before submitting
        </p>
      )}
    </div>
  </div>
);

export default ActiveQuizEngine;
