import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  socket,
  connectSocket,
  disconnectSocket,
  hostClaim,
  startQuiz as emitStartQuiz,
  nextQuestion as emitNextQuestion,
  closeRoom,
} from '../services/socket';

/* =============================================
   HostSession — Professor Live Quiz Control Panel
   ============================================= */

const HostSession = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const quizId = location.state?.quizId || null;

  /* ---- Core state ---- */
  const [phase, setPhase] = useState('loading');      // loading | lobby | live | ended
  const [pin, setPin] = useState('');
  const [roster, setRoster] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [error, setError] = useState('');

  const pinRef = useRef('');

  /* ---- 1. Create session & claim host ---- */
  useEffect(() => {
    if (!quizId || !token) {
      navigate('/dashboard', { replace: true });
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const res = await api.post('/sessions/start', { quizId });
        const sessionPin = res.data?.data?.pin || res.data?.pin;
        const total = res.data?.data?.totalQuestions || res.data?.totalQuestions || 0;

        if (!sessionPin) throw new Error('No PIN returned from server.');

        if (cancelled) return;

        setPin(sessionPin);
        setTotalQuestions(total);
        pinRef.current = sessionPin;

        connectSocket(token);

        const onConnect = () => {
          hostClaim(sessionPin, token);
        };

        if (socket.connected) {
          onConnect();
        } else {
          socket.once('connect', onConnect);
        }

        setPhase('lobby');
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to create session.');
          setPhase('loading');
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId, token]);

  /* ---- 2. Socket event listeners ---- */
  useEffect(() => {
    const onRoster = (data) => {
      const players = (Array.isArray(data) ? data : data?.roster || [])
        .filter((p) => p.role !== 'host');
      setRoster(players);
    };

    const onLeaderboard = ({ leaderboard: lb }) => {
      if (Array.isArray(lb)) {
        setLeaderboard(lb);
      }
    };

    const onQuestionRevealed = (question) => {
      setCurrentQuestion(question);
    };

    const onControlError = ({ message }) => {
      setError(message || 'Control error received.');
    };

    const onHostClaimed = () => {
      setError('');
    };

    socket.on('room-roster-updated', onRoster);
    socket.on('leaderboard-updated', onLeaderboard);
    socket.on('reveal-question', onQuestionRevealed);
    socket.on('control-error', onControlError);
    socket.on('host-claimed', onHostClaimed);

    return () => {
      socket.off('room-roster-updated', onRoster);
      socket.off('leaderboard-updated', onLeaderboard);
      socket.off('reveal-question', onQuestionRevealed);
      socket.off('control-error', onControlError);
      socket.off('host-claimed', onHostClaimed);
    };
  }, []);

  /* ---- 3. Cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      if (pinRef.current) {
        closeRoom(pinRef.current);
      }
      disconnectSocket();
    };
  }, []);

  /* ---- Actions ---- */
  const handleStartQuiz = useCallback(() => {
    emitStartQuiz(pin);
    setPhase('live');
    setQuestionIndex(0);
    emitNextQuestion(pin, 0);
  }, [pin]);

  const handleNextQuestion = useCallback(() => {
    const nextIdx = questionIndex + 1;
    if (nextIdx >= totalQuestions) {
      handleEndQuiz();
      return;
    }
    setQuestionIndex(nextIdx);
    setCurrentQuestion(null);
    emitNextQuestion(pin, nextIdx);
  }, [pin, questionIndex, totalQuestions]);

  const handleEndQuiz = useCallback(() => {
    closeRoom(pin);
    setPhase('ended');
  }, [pin]);

  /* =============================================
     RENDER
     ============================================= */

  // --- Loading / Error ---
  if (phase === 'loading') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center" style={{ background: 'var(--color-surface-base)' }}>
        <div className="text-center">
          {error ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-red-300 font-semibold text-lg mb-2">Session Error</p>
              <p className="text-slate-400 text-sm mb-6">{error}</p>
              <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)' }}>
                Back to Dashboard
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }} />
              <p className="text-slate-400 text-sm font-medium">Creating live session…</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Lobby ---
  if (phase === 'lobby') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center px-4 py-10" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-4xl animate-fade-in-up">
          {/* PIN Display */}
          <div className="text-center mb-10">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Room PIN</p>
            <div className="inline-block px-10 py-5 rounded-2xl" style={{ background: 'var(--color-surface-card)', border: '2px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 0 60px rgba(124, 58, 237, 0.15)' }}>
              <span className="text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-[0.3em] font-mono" style={{ color: 'var(--color-brand-300)', fontFamily: "'Outfit', monospace" }}>
                {pin}
              </span>
            </div>
            <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Share this PIN with your students to join the session
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Roster */}
          <div className="glass-card p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                Players Joined
              </h3>
              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
                {roster.length} online
              </span>
            </div>

            {roster.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--color-brand-400)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Waiting for students to join…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" data-testid="roster-grid">
                {roster.map((p) => (
                  <div
                    key={p.socketId || p.playerId}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300"
                    style={{ background: 'var(--color-surface-elevated)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-accent-400))' }}>
                      {(p.username || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {p.username}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Start Quiz Button */}
          <div className="text-center">
            <button
              onClick={handleStartQuiz}
              disabled={roster.length === 0 || totalQuestions === 0}
              className="px-10 py-4 rounded-xl text-lg font-extrabold text-white transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-[-2px]"
              style={{
                background: (roster.length > 0 && totalQuestions > 0)
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'rgba(100, 100, 100, 0.3)',
                boxShadow: (roster.length > 0 && totalQuestions > 0) ? '0 8px 32px rgba(34, 197, 94, 0.3)' : 'none',
                fontFamily: 'var(--font-display)',
              }}
            >
              <span className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l-3.197-2.132a1 1 0 000-1.664z" /></svg>
                Start Quiz
              </span>
            </button>
            {roster.length === 0 && totalQuestions > 0 && (
              <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                At least one student must join before starting
              </p>
            )}
            {totalQuestions === 0 && (
              <p className="text-xs mt-3 text-red-400 font-semibold">
                This quiz has 0 questions. Please add questions before starting.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Live Orchestration ---
  if (phase === 'live') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col px-4 py-8" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-5xl mx-auto animate-fade-in-up">
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                <span className="w-2 h-2 mr-2 rounded-full animate-pulse" style={{ background: '#f87171' }} />
                LIVE
              </span>
              <span className="text-sm font-mono font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                PIN: {pin}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                Question {questionIndex + 1} / {totalQuestions}
              </span>
              <button
                onClick={handleEndQuiz}
                className="px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-200 hover:bg-red-950/40"
                style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)' }}
              >
                End Quiz
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-sm text-center">{error}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Question Preview */}
            <div className="lg:col-span-2 glass-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>Current Question</h3>
              {currentQuestion ? (
                <div>
                  <p className="text-xl font-bold mb-6" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                    {currentQuestion.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(currentQuestion.options || []).map((opt, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 rounded-xl text-sm font-medium"
                        style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-secondary)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
                      >
                        <span className="font-bold mr-2" style={{ color: 'var(--color-brand-300)' }}>{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }} />
                  <span className="ml-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading question…</span>
                </div>
              )}

              {/* Next Question Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={handleNextQuestion}
                  className="px-8 py-3.5 rounded-xl text-sm font-extrabold text-white transition-all duration-300 cursor-pointer hover:translate-y-[-2px]"
                  style={{
                    background: questionIndex + 1 >= totalQuestions
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
                    boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {questionIndex + 1 >= totalQuestions ? '🏁 Finish Quiz' : 'Next Question →'}
                </button>
              </div>
            </div>

            {/* Leaderboard Sidebar */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>Leaderboard</h3>
              {leaderboard.length === 0 ? (
                <p className="text-xs text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                  Scores will appear after answers are submitted
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={entry.playerId}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-500"
                      style={{
                        background: i === 0 ? 'rgba(234, 179, 8, 0.08)' : 'var(--color-surface-elevated)',
                        border: `1px solid ${i === 0 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(139, 92, 246, 0.08)'}`,
                      }}
                    >
                      {/* Rank */}
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                        style={{
                          background: i === 0 ? 'linear-gradient(135deg, #eab308, #f59e0b)' : i === 1 ? 'linear-gradient(135deg, #94a3b8, #cbd5e1)' : i === 2 ? 'linear-gradient(135deg, #b45309, #d97706)' : 'var(--color-surface-card)',
                          color: i < 3 ? '#0f0a1e' : 'var(--color-text-secondary)',
                        }}
                      >
                        {entry.placement}
                      </span>

                      {/* Name & Score */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {entry.username}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--color-brand-300)' }}>
                            {entry.score.toLocaleString()} pts
                          </span>
                          {entry.currentStreak >= 2 && (
                            <span className="text-xs" style={{ color: '#f59e0b' }}>
                              🔥 {entry.currentStreak}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Position Change */}
                      {entry.positionChange !== 0 && (
                        <span className="text-xs font-semibold" style={{ color: entry.positionChange > 0 ? '#4ade80' : '#f87171' }}>
                          {entry.positionChange > 0 ? `▲${entry.positionChange}` : `▼${Math.abs(entry.positionChange)}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Ended ---
  if (phase === 'ended') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-2xl text-center animate-fade-in-up">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.12)', border: '2px solid rgba(34, 197, 94, 0.25)' }}>
            <span className="text-4xl">🏆</span>
          </div>
          <h2 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            Quiz Complete!
          </h2>
          <p className="mb-8 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            The session has ended. Here are the final standings.
          </p>

          {/* Final Leaderboard */}
          {leaderboard.length > 0 && (
            <div className="glass-card p-6 mb-8 text-left">
              <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>Final Leaderboard</h3>
              <div className="space-y-2">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{
                      background: i === 0 ? 'rgba(234, 179, 8, 0.1)' : 'var(--color-surface-elevated)',
                      border: `1px solid ${i === 0 ? 'rgba(234, 179, 8, 0.25)' : 'rgba(139, 92, 246, 0.08)'}`,
                    }}
                  >
                    <span className="text-lg mr-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.placement}`}</span>
                    <span className="flex-1 font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{entry.username}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-brand-300)' }}>{entry.score.toLocaleString()} pts</span>
                    {entry.currentStreak >= 2 && <span className="text-xs" style={{ color: '#f59e0b' }}>🔥{entry.currentStreak}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
            style={{ background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default HostSession;
