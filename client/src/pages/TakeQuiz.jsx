import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ActiveQuizEngine from '../components/ActiveQuizEngine';

const buildAdaptiveQuiz = (result) => {
  if (!result?.adaptiveVariantId || !Array.isArray(result.adaptiveQuestions)) return null;

  const type = result.adaptiveVariant?.type || result.status;
  const isRemediation = type === 'remediation';

  return {
    _id: result.adaptiveVariantId,
    title: isRemediation ? 'Adaptive Remediation' : 'Adaptive Enrichment',
    description: isRemediation
      ? 'A focused review set tailored to the questions you missed.'
      : 'An advanced challenge set tailored to your mastery.',
    questions: result.adaptiveQuestions,
  };
};

const TakeQuiz = () => {
  const { id: quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

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

  const allAnsweredFor = useCallback(
    (targetQuiz) =>
      Boolean(
        targetQuiz &&
          targetQuiz.questions.every((question) => {
            const answer = answers[question._id];
            return answer != null && String(answer).trim() !== '';
          })
      ),
    [answers]
  );

  const submitQuiz = useCallback(
    async (targetQuiz) => {
      if (!targetQuiz) return;
      setSubmitting(true);
      setError('');

      const answersArray = targetQuiz.questions.map((question) => ({
        questionId: question._id,
        selectedAnswer: answers[question._id] || null,
      }));

      try {
        const res = await api.post('/attempts/submit', {
          quizId: targetQuiz._id,
          answers: answersArray,
        });
        setResult(res.data);
        if (res.data?.adaptiveVariantId) {
          setAnswers({});
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Submission failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [answers]
  );

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" style={{ background: 'var(--color-surface-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error && !quiz) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" style={{ background: 'var(--color-surface-base)' }}>
        <div className="glass-card p-8 text-center max-w-md">
          <p className="text-red-300 mb-4">{error}</p>
          <button onClick={() => navigate('/student/dashboard')} className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all cursor-pointer" style={{ background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    const { status, data, message } = result;
    const adaptiveQuiz = buildAdaptiveQuiz(result);
    const isRemediation = status === 'remediation';
    const isEnrichment = status === 'enrichment';
    const isStandard = status === 'standard';

    if (adaptiveQuiz) {
      return (
        <div className="min-h-[calc(100vh-64px)] px-4 py-8 animate-fade-in-up" style={{ background: 'var(--color-surface-base)' }}>
          <div className="w-full max-w-3xl mx-auto mb-6 p-6 rounded-2xl text-center" style={{
            background: isRemediation ? 'rgba(234, 179, 8, 0.08)' : 'rgba(34, 197, 94, 0.08)',
            border: `1px solid ${isRemediation ? 'rgba(234, 179, 8, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`,
          }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: isRemediation ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.15)' }}>
              <span className="text-3xl">{isRemediation ? '!' : '+'}</span>
            </div>
            <h3 className="text-xl font-extrabold mb-2" style={{ color: isRemediation ? '#fbbf24' : '#4ade80', fontFamily: 'var(--font-display)' }}>
              {isRemediation ? 'Reinforce the Core Concepts' : 'Advanced Challenge Unlocked'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {message}
            </p>
          </div>

          <ActiveQuizEngine
            quiz={adaptiveQuiz}
            answers={answers}
            error={error}
            submitting={submitting}
            allAnswered={allAnsweredFor(adaptiveQuiz)}
            onSelectOption={handleSelectOption}
            onShortAnswerChange={handleShortAnswerChange}
            onSubmit={() => submitQuiz(adaptiveQuiz)}
            submitLabel={isRemediation ? 'Submit Revision Assessment' : 'Submit Advanced Challenge'}
          />
        </div>
      );
    }

    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-2xl animate-fade-in-up">
          <div className="glass-card p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{
              background: isEnrichment ? 'rgba(34, 197, 94, 0.12)' : isRemediation ? 'rgba(234, 179, 8, 0.12)' : 'rgba(139, 92, 246, 0.12)',
              border: `2px solid ${isEnrichment ? 'rgba(34, 197, 94, 0.3)' : isRemediation ? 'rgba(234, 179, 8, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
            }}>
              <span className="text-4xl">{isEnrichment ? '+' : isRemediation ? '!' : 'OK'}</span>
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

            {!isStandard && (
              <p className="text-sm mb-4 p-3 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)', color: 'var(--color-text-secondary)' }}>
                {message}
              </p>
            )}
            {isStandard && (
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                {message}
              </p>
            )}

            <button
              onClick={() => navigate('/student/dashboard')}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
              style={{ background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-8" style={{ background: 'var(--color-surface-base)' }}>
      <ActiveQuizEngine
        quiz={quiz}
        answers={answers}
        error={error}
        submitting={submitting}
        allAnswered={allAnsweredFor(quiz)}
        onSelectOption={handleSelectOption}
        onShortAnswerChange={handleShortAnswerChange}
        onSubmit={() => submitQuiz(quiz)}
      />
    </div>
  );
};

export default TakeQuiz;
