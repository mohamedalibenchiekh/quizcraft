import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const StudentDashboard = () => {
  const navigate = useNavigate();

  const [pinInput, setPinInput] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setFetchError('');

    const results = await Promise.allSettled([
      api.get('/attempts/my'),
      api.get('/attempts/stats'),
    ]);

    let anySucceeded = false;

    const attemptsResult = results[0];
    if (attemptsResult.status === 'fulfilled' && attemptsResult.value.data?.success) {
      setAttempts(attemptsResult.value.data.data || []);
      anySucceeded = true;
    }

    const statsResult = results[1];
    if (statsResult.status === 'fulfilled' && statsResult.value.data?.success) {
      setStats(statsResult.value.data.data);
      anySucceeded = true;
    }

    if (!anySucceeded) {
      setFetchError('Failed to load dashboard data.');
    }

    setLoading(false);
  };

  const handleJoinLiveSession = () => {
    const pin = pinInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(pin)) {
      setPinError('PIN must be exactly 6 alphanumeric characters.');
      return;
    }
    setPinError('');
    navigate('/session', { state: { roomCode: pin } });
  };

  const handlePinChange = (e) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setPinInput(raw);
    if (fetchError) setFetchError('');
    if (pinError) setPinError('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
      <div className="mb-8">
        <h1
          className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-cyan-400 to-green-400 bg-clip-text text-transparent"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Student Dashboard
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Join live sessions, review past performances, and track your progress.
        </p>
      </div>

      {fetchError && (
        <div className="mb-8 p-4 border border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded-xl">
          <p className="text-sm font-medium">{fetchError}</p>
        </div>
      )}
      {pinError && (
        <div className="mb-4 p-3 border border-red-500/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded-xl">
          <p className="text-sm font-medium">{pinError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1">
          <div className="glass-card p-6">
            <div className="text-center mb-6">
              <div
                className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-accent-400))' }}
              >
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                Join Live Quiz
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Enter the 6-character room PIN
              </p>
            </div>

            <div className="space-y-4">
              <input
                id="student-pin-input"
                type="text"
                maxLength={6}
                placeholder="ABC123"
                value={pinInput}
                onChange={handlePinChange}
                className="w-full px-4 py-3.5 rounded-xl text-center text-2xl font-mono font-extrabold tracking-[0.25em] outline-none transition-all duration-200 focus:ring-2"
                style={{
                  background: 'var(--color-surface-input)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  caretColor: 'var(--color-brand-400)',
                }}
                autoComplete="off"
              />

              <button
                onClick={handleJoinLiveSession}
                disabled={pinInput.length !== 6}
                className="w-full py-3.5 rounded-xl text-base font-extrabold text-white transition-all duration-300 cursor-pointer hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Join Live Quiz Session
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(139, 92, 246, 0.12)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--color-brand-300)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-3xl font-extrabold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              {loading ? '…' : stats?.totalQuizzes ?? 0}
            </span>
            <span className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Total Quizzes Completed
            </span>
          </div>

          <div className="glass-card p-5 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(34, 197, 94, 0.12)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--color-accent-green-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-3xl font-extrabold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              {loading ? '…' : stats ? `${stats.averageScoreRatio}%` : '0%'}
            </span>
            <span className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Average Score Accuracy
            </span>
          </div>

          <div className="glass-card p-5 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(234, 179, 8, 0.12)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--color-accent-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <span className="text-3xl font-extrabold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              {loading ? '…' : stats?.trophies ?? 0}
            </span>
            <span className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-muted)' }}>
              Streaks &amp; Adaptive Trophies
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/70">
          <h2 className="text-lg font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            Historical Review
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Past assignment attempts and performance summaries
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="w-10 h-10 animate-spin text-indigo-500 dark:text-indigo-400 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading attempts…</span>
          </div>
        ) : attempts.length === 0 ? (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-16 text-center bg-slate-50 dark:bg-slate-950/10 m-6">
            <svg className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-slate-700 dark:text-slate-300 font-bold text-lg mb-1">No attempts yet</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
              Complete a quiz or join a live session to see your results here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/70">
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Quiz Title
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Completion Date
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Final Score
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Adaptive Path
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {attempts.map((attempt) => (
                  <tr key={attempt._id} className="hover:bg-slate-100 dark:hover:bg-slate-950/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {attempt.quizId?.title || 'Unknown Quiz'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(attempt.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          attempt.scoreRatio >= 0.85
                            ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400'
                            : attempt.scoreRatio >= 0.5
                              ? 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {Math.round(attempt.scoreRatio * 100)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {attempt.adaptiveType === 'enrichment' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-500/20">
                          <span>🏆</span> Enrichment
                        </span>
                      ) : attempt.adaptiveType === 'remediation' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-500/20">
                          <span>📚</span> Remediation
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/10">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/student/review/${attempt._id}`)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
                        style={{
                          background: 'rgba(139, 92, 246, 0.1)',
                          color: 'var(--color-brand-300)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                        }}
                      >
                        Review Performance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
