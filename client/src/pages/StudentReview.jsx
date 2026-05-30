import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const StudentReview = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) return;
    setLoading(true);
    setError('');
    api
      .get(`/attempts/${attemptId}`)
      .then((res) => {
        if (res.data?.success) {
          setAttempt(res.data.data);
        } else {
          setError('Failed to load attempt details.');
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load attempt details.');
        setLoading(false);
      });
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" style={{ background: 'var(--color-surface-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading review…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer hover:translate-y-[-1px]"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  const scorePct = Math.round(attempt.scoreRatio * 100);
  const isHigh = scorePct >= 85;
  const isMid = scorePct >= 50;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up" style={{ background: 'var(--color-surface-base)' }}>
      <button
        onClick={() => navigate('/student/dashboard')}
        className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors duration-200 cursor-pointer"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button>

      <div className="glass-card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              {attempt.quizTitle}
            </h1>
            {attempt.quizDescription && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {attempt.quizDescription}
              </p>
            )}
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Completed {new Date(attempt.completedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="block text-3xl font-extrabold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {attempt.score} / {attempt.totalQuestions}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Score</span>
            </div>
            <div className="text-center">
              <span
                className={`block text-3xl font-extrabold ${
                  isHigh ? 'text-green-500 dark:text-green-400' : isMid ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'
                }`}
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {scorePct}%
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Accuracy</span>
            </div>
          </div>
        </div>

        {attempt.adaptiveTriggered && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm font-medium ${
              attempt.adaptiveType === 'enrichment'
                ? 'bg-green-100 dark:bg-green-500/10 border border-green-300 dark:border-green-500/25 text-green-700 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-500/10 border border-yellow-300 dark:border-yellow-500/25 text-yellow-700 dark:text-yellow-400'
            }`}
          >
            {attempt.adaptiveType === 'enrichment'
              ? 'Advanced challenge unlocked — concept mastery confirmed!'
              : 'Remediation block triggered — additional practice recommended.'}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {attempt.answers.map((answer, idx) => {
          const isCorrect = answer.isCorrect;
          return (
            <div key={answer.questionId || idx} className="glass-card p-5">
              <div className="flex items-start gap-3 mb-3">
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold ${
                    isCorrect
                      ? 'bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400'
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {answer.questionText}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-brand-500/8 text-slate-600 dark:text-slate-400">
                      {answer.questionType || 'Unknown'}
                    </span>
                    {answer.difficulty && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-brand-500/8 text-slate-600 dark:text-slate-400">
                        {answer.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 text-lg ${
                    isCorrect ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {isCorrect ? '✓' : '✗'}
                </span>
              </div>

              <div className="ml-11 space-y-1.5">
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Your answer:{' '}
                  <span className={`font-semibold ${isCorrect ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {answer.selectedAnswer || '(No answer provided)'}
                  </span>
                </p>

              </div>

              {answer.questionType === 'MCQ' && Array.isArray(answer.options) && answer.options.length > 0 && (
                <div className="ml-11 mt-3 flex flex-wrap gap-2">
                  {answer.options.map((opt, oi) => {
                    const isOptionSelected = opt === answer.selectedAnswer;
                    return (
                      <span
                        key={oi}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                          isOptionSelected
                            ? isCorrect
                              ? 'bg-green-100 dark:bg-green-500/12 text-green-600 dark:text-green-400 border-green-300 dark:border-green-500/30'
                              : 'bg-red-100 dark:bg-red-500/12 text-red-600 dark:text-red-400 border-red-300 dark:border-red-500/30'
                            : 'bg-slate-50 dark:bg-brand-500/6 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-brand-500/10'
                        }`}
                      >
                        {opt}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate('/student/dashboard')}
          className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
          style={{
            background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default StudentReview;
