import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const StudentQuizBrowser = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setLoading(true);
        // Fetch all published quizzes (requires a backend endpoint accessible to students)
        const res = await api.get('/quizzes/published');
        if (res.data?.success) {
          setQuizzes(res.data.data || []);
        } else {
          setError('Failed to load quizzes.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading quizzes.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" style={{ background: 'var(--color-surface-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading quizzes…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10" style={{ background: 'var(--color-surface-base)' }}>
      <div className="max-w-4xl mx-auto animate-fade-in-up">
        <h1 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
          Available Quizzes
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          Select a quiz below to test your knowledge. After submission, you'll receive adaptive recommendations based on your performance.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 text-sm">{error}</div>
        )}

        {quizzes.length === 0 && !error && (
          <div className="glass-card p-12 text-center">
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              No quizzes available yet.
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Ask your professor to publish a quiz.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <div key={quiz._id} className="glass-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {quiz.title}
                </h2>
                {quiz.description && (
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {quiz.description}
                  </p>
                )}
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                  {quiz.questions?.length || 0} questions
                </p>
              </div>
              <button
                onClick={() => navigate(`/quiz/${quiz._id}/take`)}
                className="px-6 py-3 rounded-xl text-sm font-extrabold text-white transition-all duration-200 cursor-pointer hover:translate-y-[-1px] whitespace-nowrap"
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Take Quiz
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentQuizBrowser;
