import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const OPTION_COLORS = [
  { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', accent: '#f87171' },
  { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', accent: '#60a5fa' },
  { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', accent: '#fbbf24' },
  { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', accent: '#4ade80' },
];

const TakeQuiz = () => {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const pendingAdaptiveRef = useRef(null);
  const adaptiveRef = useRef(null);

  // Sync latest adaptive questions from result into ref so handleRetry can use them
  useEffect(() => {
    if (result?.adaptiveQuestions?.length > 0) {
      pendingAdaptiveRef.current = result.adaptiveQuestions;
    }
  }, [result]);

  const handleRetry = useCallback(() => {
    const adaptiveQs = pendingAdaptiveRef.current;
    if (adaptiveQs && adaptiveQs.length > 0 && quiz) {
      setQuiz({
        _id: quiz._id,
        title: 'Adaptive Challenge',
        description: 'Questions tailored to your performance',
        questions: adaptiveQs,
      });
      setAnswers({});
      setError('');
      setResult(null);
      pendingAdaptiveRef.current = null;
    } else {
      setResult(null);
      setAnswers({});
      setError('');
    }
  }, [quizId, quiz]);

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    api
      .get(`/quizzes/${quizId}`)
      .then((res) => {
        setQuiz(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load quiz.');
        setLoading(false);
      });
  }, [quizId]);

  const handleSelectOption = useCallback((questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }, []);

  const handleShortAnswerChange = useCallback((questionId, text) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!quiz) return;
    setSubmitting(true);
    setError('');

    const answersArray = quiz.questions.map((q) => ({
      questionId: q._id,
      selectedAnswer: answers[q._id] || null,
    }));

    try {
      const res = await api.post('/attempts/submit', {
        quizId: quiz._id,
        answers: answersArray,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [quiz, answers]);

  const allAnswered =
    quiz &&
    quiz.questions.every((q) => answers[q._id] != null && answers[q._id].trim() !== '');

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" style={{ background: 'var(--color-surface-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading quiz…</p>
        </div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" style={{ background: 'var(--color-surface-base)' }}>
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-red-300 mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all cursor-pointer" style={{ background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)' }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    const { status, data, adaptiveQuestions, message } = result;
    const isRemediation = status === 'remediation';
    const isEnrichment = status === 'enrichment';
    const isStandard = status === 'standard';

    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-2xl animate-fade-in-up">
          {/* Adaptive Banner — Remediation */}
          {isRemediation && (
            <div className="mb-6 p-6 rounded-2xl text-center" style={{
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
            }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
                <span className="text-3xl">📚</span>
              </div>
              <h3 className="text-xl font-extrabold mb-2" style={{ color: '#fbbf24', fontFamily: 'var(--font-display)' }}>
                Let's reinforce the basics!
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                We've prepared a quick, simplified revision retry deck to lock in these core concepts.
              </p>
              {Array.isArray(adaptiveQuestions) && adaptiveQuestions.length > 0 && (
                <div className="space-y-3 mb-4 text-left">
                  {adaptiveQuestions.map((q, i) => (
                    <div key={q._id} className="p-3 rounded-xl" style={{ background: 'var(--color-surface-elevated)', border: '1px solid rgba(234, 179, 8, 0.12)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {i + 1}. {q.text}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {q.type} &middot; {q.difficulty}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleRetry}
                className="px-6 py-3 rounded-xl text-sm font-extrabold text-white transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.25)' }}
              >
                Retry Quiz with Reinforced Concepts
              </button>
            </div>
          )}

          {/* Adaptive Banner — Enrichment */}
          {isEnrichment && (
            <div className="mb-6 p-6 rounded-2xl text-center" style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
            }}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                <span className="text-3xl">🏆</span>
              </div>
              <h3 className="text-xl font-extrabold mb-2" style={{ color: '#4ade80', fontFamily: 'var(--font-display)' }}>
                Concept Mastery Confirmed!
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Advanced challenge block unlocked. Ready to test your depth?
              </p>
              {Array.isArray(adaptiveQuestions) && adaptiveQuestions.length > 0 && (
                <div className="space-y-3 mb-4 text-left">
                  {adaptiveQuestions.map((q, i) => (
                    <div key={q._id} className="p-3 rounded-xl" style={{ background: 'var(--color-surface-elevated)', border: '1px solid rgba(34, 197, 94, 0.12)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {i + 1}. {q.text}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {q.type} &middot; {q.difficulty}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleRetry}
                className="px-6 py-3 rounded-xl text-sm font-extrabold text-white transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 16px rgba(34, 197, 94, 0.25)' }}
              >
                Start Advanced Challenge
              </button>
            </div>
          )}

          {/* Score Card */}
          <div className="glass-card p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
              background: isEnrichment ? 'rgba(34, 197, 94, 0.12)' : isRemediation ? 'rgba(234, 179, 8, 0.12)' : 'rgba(139, 92, 246, 0.12)',
              border: `2px solid ${isEnrichment ? 'rgba(34, 197, 94, 0.3)' : isRemediation ? 'rgba(234, 179, 8, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
            }}>
              <span className="text-4xl">{isEnrichment ? '🎉' : isRemediation ? '💪' : '✅'}</span>
            </div>

            <h2 className="text-2xl font-extrabold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              {data.score} / {data.totalQuestions}
            </h2>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Score: {Math.round(data.scoreRatio * 100)}%
            </p>
            <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
              {data.correctCount} correct &middot; {data.totalQuestions - data.correctCount} incorrect
            </p>

            {isRemediation && (
              <p className="text-sm mb-4 p-3 rounded-xl" style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.15)', color: '#fbbf24' }}>
                {message}
              </p>
            )}
            {isEnrichment && (
              <p className="text-sm mb-4 p-3 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                {message}
              </p>
            )}
            {isStandard && (
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {message}
              </p>
            )}

            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
              style={{ background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)' }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-8" style={{ background: 'var(--color-surface-base)' }}>
      <div className="w-full max-w-3xl mx-auto">
        {/* Quiz Header */}
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

        {/* Questions */}
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

              {/* MCQ / True-False Options */}
              {['MCQ', 'True-False'].includes(question.type) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.options.map((option, oIdx) => {
                    const colors = OPTION_COLORS[oIdx % OPTION_COLORS.length];
                    const isSelected = answers[question._id] === option;
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleSelectOption(question._id, option)}
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

              {/* Short Answer */}
              {question.type === 'Short-Answer' && (
                <textarea
                  className="w-full p-4 rounded-xl outline-none transition-all duration-200 focus:ring-2 resize-none"
                  style={{
                    background: 'var(--color-surface-input)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    caretColor: 'var(--color-brand-400)',
                  }}
                  placeholder="Type your answer here…"
                  rows={3}
                  value={answers[question._id] || ''}
                  onChange={(e) => handleShortAnswerChange(question._id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="glass-card p-6 text-center">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="px-10 py-3.5 rounded-xl text-base font-extrabold text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:translate-y-[-1px]"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
              boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Assessment'}
          </button>
          {!allAnswered && (
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
              Answer all questions before submitting
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TakeQuiz;
