import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  socket,
  connectSocket,
  disconnectSocket,
  joinRoom,
  submitAnswer as emitSubmitAnswer,
} from '../services/socket';

/* =============================================
   LiveSession — Student Live Quiz Portal
   Replaces the previous StudentSession placeholder.
   ============================================= */

const QUESTION_DURATION_S = 30;

const OPTION_COLORS = [
  { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', accent: '#f87171' },
  { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', accent: '#60a5fa' },
  { bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', accent: '#fbbf24' },
  { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', accent: '#4ade80' },
];

const StudentSession = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  /* ---- State ---- */
  const [phase, setPhase] = useState('join');           // join | lobby | question | feedback | leaderboard | ended
  const [isConnecting, setIsConnecting] = useState(false);
  const [pinInput, setPinInput] = useState(location.state?.roomCode || '');
  const [usernameInput, setUsernameInput] = useState('');
  const [activePin, setActivePin] = useState('');
  const [error, setError] = useState('');
  const [roster, setRoster] = useState([]);

  // Question state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [countdown, setCountdown] = useState(QUESTION_DURATION_S);
  const [frozen, setFrozen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const countdownRef = useRef(null);

  // Feedback state
  const [feedback, setFeedback] = useState(null); // { type: 'acknowledged'|'rejected', data }
  const [leaderboard, setLeaderboard] = useState([]);

  const activePinRef = useRef('');

  /* ---- Auto-join if roomCode was passed from Home ---- */
  useEffect(() => {
    if (location.state?.roomCode && !activePin) {
      setPinInput(location.state.roomCode);
    }
  }, [location.state]);

  /* ---- Socket event wiring ---- */
  useEffect(() => {
    const onJoinError = ({ message }) => {
      setError(message || 'Failed to join room.');
      setPhase('join');
      setIsConnecting(false);
    };

    const onRoster = (data) => {
      const players = (Array.isArray(data) ? data : data?.roster || [])
        .filter((p) => p.role !== 'host');
      setRoster(players);
    };

    const onQuizStarted = () => {
      setPhase('question');
    };

    const onRevealQuestion = (question) => {
      // Reset question state
      setCurrentQuestion(question);
      setFrozen(false);
      setSelectedOption(null);
      setFeedback(null);
      setCountdown(QUESTION_DURATION_S);
      setPhase('question');
    };

    const onAcknowledged = (data) => {
      setFeedback({ type: 'acknowledged', data });
      setPhase('feedback');
    };

    const onRejected = (data) => {
      setFeedback({ type: 'rejected', data });
      setFrozen(true);
      setPhase('feedback');
    };

    const onLeaderboard = ({ leaderboard: lb }) => {
      if (Array.isArray(lb)) {
        setLeaderboard(lb);
        // Only show leaderboard view if we're in feedback phase or question phase
        setPhase((currentPhase) => {
          if (currentPhase === 'feedback' || currentPhase === 'question') {
            return 'leaderboard';
          }
          return currentPhase;
        });
      }
    };

    const onTerminated = () => {
      setPhase('ended');
      clearInterval(countdownRef.current);
    };

    const onConnectError = (err) => {
      setError(err?.message || 'Socket connection failed.');
      setIsConnecting(false);
    };

    socket.on('join-error', onJoinError);
    socket.on('room-roster-updated', onRoster);
    socket.on('quiz-started', onQuizStarted);
    socket.on('reveal-question', onRevealQuestion);
    socket.on('answer-acknowledged', onAcknowledged);
    socket.on('answer-rejected', onRejected);
    socket.on('leaderboard-updated', onLeaderboard);
    socket.on('quiz-terminated', onTerminated);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('join-error', onJoinError);
      socket.off('room-roster-updated', onRoster);
      socket.off('quiz-started', onQuizStarted);
      socket.off('reveal-question', onRevealQuestion);
      socket.off('answer-acknowledged', onAcknowledged);
      socket.off('answer-rejected', onRejected);
      socket.off('leaderboard-updated', onLeaderboard);
      socket.off('quiz-terminated', onTerminated);
      socket.off('connect_error', onConnectError);
    };
  }, []); // Bind exactly once on mount

  /* ---- Countdown timer ---- */
  useEffect(() => {
    if (phase !== 'question' || !currentQuestion) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          // QC-BR-03: Auto-freeze when time runs out
          setFrozen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [phase, currentQuestion]);

  /* ---- Cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      clearInterval(countdownRef.current);
      disconnectSocket();
    };
  }, []);

  /* ---- Actions ---- */
  const handleJoinLobby = useCallback(() => {
    if (isConnecting) return;

    const pin = pinInput.trim().toUpperCase();
    const username = usernameInput.trim();

    if (!/^[A-Z0-9]{6}$/.test(pin)) {
      setError('PIN must be exactly 6 alphanumeric characters.');
      return;
    }
    if (!username || username.length < 1) {
      setError('Please enter a display name.');
      return;
    }

    setError('');
    setIsConnecting(true);
    setActivePin(pin);
    activePinRef.current = pin;

    connectSocket(token || undefined);

    const onConnect = () => {
      joinRoom(pin, username);
      setPhase('lobby');
      setIsConnecting(false);
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.once('connect', onConnect);
    }
  }, [pinInput, usernameInput, token, isConnecting]);

  const handleSelectOption = useCallback((option) => {
    if (frozen) return;

    // QC-BR-03: Immediately freeze all inputs on selection
    setFrozen(true);
    setSelectedOption(option);
    clearInterval(countdownRef.current);

    // Emit answer
    if (currentQuestion && activePin) {
      emitSubmitAnswer(activePin, currentQuestion._id, option);
    }
  }, [frozen, currentQuestion, activePin]);

  /* ---- Countdown ring SVG math ---- */
  const RING_RADIUS = 54;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const countdownProgress = countdown / QUESTION_DURATION_S;
  const ringOffset = RING_CIRCUMFERENCE * (1 - countdownProgress);

  /* =============================================
     RENDER
     ============================================= */

  // --- Join Gate ---
  if (phase === 'join') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-md animate-fade-in-up">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-brand-500), var(--color-accent-400))' }}>
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                Join Live Quiz
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Enter the room PIN shared by your professor
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Room PIN</label>
                <input
                  id="pin-input"
                  type="text"
                  maxLength={6}
                  placeholder="ABC123"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3.5 rounded-xl text-center text-2xl font-mono font-extrabold tracking-[0.25em] outline-none transition-all duration-200 focus:ring-2"
                  style={{
                    background: 'var(--color-surface-input)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    caretColor: 'var(--color-brand-400)',
                  }}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Display Name</label>
                <input
                  id="username-input"
                  type="text"
                  maxLength={24}
                  placeholder="Your name"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-base font-medium outline-none transition-all duration-200 focus:ring-2"
                  style={{
                    background: 'var(--color-surface-input)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    caretColor: 'var(--color-brand-400)',
                  }}
                  autoComplete="off"
                />
              </div>

              <button
                id="join-lobby-btn"
                onClick={handleJoinLobby}
                disabled={isConnecting}
                className="w-full py-3.5 rounded-xl text-base font-extrabold text-white transition-all duration-300 cursor-pointer hover:translate-y-[-1px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)',
                  boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {isConnecting ? 'Connecting…' : 'Join Lobby'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Lobby Waiting ---
  if (phase === 'lobby') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-lg text-center animate-fade-in-up">
          <div className="glass-card p-8">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-6" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' }}>
              <span className="w-2 h-2 mr-2 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
              Connected
            </span>

            <div className="mb-4">
              <span className="inline-block px-4 py-1.5 rounded-lg text-sm font-mono font-semibold tracking-widest" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--color-brand-300)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                Room {activePin}
              </span>
            </div>

            <h2 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              Waiting for Host…
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
              The quiz will start shortly. {roster.length > 0 && `${roster.length} player${roster.length !== 1 ? 's' : ''} in the lobby.`}
            </p>

            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Active Question ---
  if (phase === 'question') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-8" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-2xl animate-fade-in-up">
          {/* Countdown Ring */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r={RING_RADIUS}
                  fill="none"
                  stroke={countdown <= 5 ? '#ef4444' : countdown <= 10 ? '#f59e0b' : '#8b5cf6'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-extrabold" style={{ color: countdown <= 5 ? '#ef4444' : 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                  {countdown}
                </span>
              </div>
            </div>
          </div>

          {/* Question */}
          {currentQuestion && (
            <div className="glass-card p-6 mb-6">
              <p className="text-xl font-bold text-center" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {currentQuestion.question}
              </p>
            </div>
          )}

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="options-container">
            {(currentQuestion?.options || []).map((option, i) => {
              const colors = OPTION_COLORS[i % OPTION_COLORS.length];
              const isSelected = selectedOption === option;

              return (
                <button
                  key={i}
                  data-testid={`option-btn-${i}`}
                  onClick={() => handleSelectOption(option)}
                  disabled={frozen}
                  className="relative px-6 py-5 rounded-2xl text-left font-bold text-base transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: isSelected ? colors.border : colors.bg,
                    border: `2px solid ${isSelected ? colors.accent : colors.border}`,
                    color: 'var(--color-text-primary)',
                    transform: isSelected ? 'scale(0.97)' : undefined,
                  }}
                >
                  <span className="mr-3 inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-extrabold" style={{ background: colors.border, color: colors.accent }}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          {/* Frozen indicator */}
          {frozen && (
            <div className="mt-6 text-center">
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold" style={{ background: 'rgba(139, 92, 246, 0.12)', color: 'var(--color-brand-300)' }}>
                {selectedOption ? '✓ Answer submitted — waiting for results…' : "⏱ Time's up!"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Feedback ---
  if (phase === 'feedback') {
    const isCorrect = feedback?.type === 'acknowledged' && feedback?.data?.correct;
    const isTimeout = feedback?.type === 'rejected' && feedback?.data?.reason === 'timeout';

    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-md text-center animate-fade-in-up">
          {!feedback ? (
            /* Loading state for answer-acknowledged */
            <div>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--color-brand-400)', borderTopColor: 'transparent' }} />
              <p className="text-lg font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Processing your answer…</p>
            </div>
          ) : (
            <div className="glass-card p-8">
              {/* Result Icon */}
              <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{
                background: isCorrect ? 'rgba(34, 197, 94, 0.12)' : isTimeout ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `2px solid ${isCorrect ? 'rgba(34, 197, 94, 0.3)' : isTimeout ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}>
                <span className="text-5xl">{isCorrect ? '🎉' : isTimeout ? '⏰' : '😔'}</span>
              </div>

              <h3 className="text-2xl font-extrabold mb-2" style={{
                fontFamily: 'var(--font-display)',
                color: isCorrect ? '#4ade80' : isTimeout ? '#fbbf24' : '#f87171',
              }}>
                {isCorrect ? 'Correct!' : isTimeout ? 'Time\'s Up!' : 'Incorrect'}
              </h3>

              {feedback.type === 'acknowledged' && (
                <div className="space-y-2 mb-4">
                  <p className="text-lg font-bold" style={{ color: 'var(--color-brand-300)' }}>
                    +{feedback.data.pointsAwarded || 0} points
                  </p>
                  {feedback.data.streakBonus > 0 && (
                    <p className="text-sm" style={{ color: '#f59e0b' }}>🔥 Streak bonus: +{feedback.data.streakBonus}</p>
                  )}
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Total: {feedback.data.score?.toLocaleString() || 0} pts
                  </p>
                </div>
              )}

              {isTimeout && (
                <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  You didn't answer in time. No points awarded.
                </p>
              )}

              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Waiting for the next question…
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Leaderboard Between Questions ---
  if (phase === 'leaderboard') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-lg animate-fade-in-up">
          <div className="glass-card p-8">
            <h3 className="text-center text-sm font-semibold uppercase tracking-wider mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Current Standings
            </h3>
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.playerId}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500"
                  style={{
                    background: i === 0 ? 'rgba(234, 179, 8, 0.1)' : 'var(--color-surface-elevated)',
                    border: `1px solid ${i === 0 ? 'rgba(234, 179, 8, 0.25)' : 'rgba(139, 92, 246, 0.08)'}`,
                  }}
                >
                  <span className="text-base mr-1">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.placement}`}</span>
                  <span className="flex-1 font-bold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{entry.username}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-brand-300)' }}>{entry.score.toLocaleString()}</span>
                  {entry.positionChange !== 0 && (
                    <span className="text-xs font-semibold" style={{ color: entry.positionChange > 0 ? '#4ade80' : '#f87171' }}>
                      {entry.positionChange > 0 ? `▲${entry.positionChange}` : `▼${Math.abs(entry.positionChange)}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-muted)' }}>Next question coming soon…</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Ended ---
  if (phase === 'ended') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4" style={{ background: 'var(--color-surface-base)' }}>
        <div className="w-full max-w-md text-center animate-fade-in-up">
          <div className="glass-card p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.12)', border: '2px solid rgba(139, 92, 246, 0.25)' }}>
              <span className="text-4xl">🏁</span>
            </div>
            <h2 className="text-3xl font-extrabold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              Quiz Over!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              The host has ended the session. Thanks for playing!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
              style={{ background: 'linear-gradient(135deg, var(--color-brand-500), #6d28d9)', boxShadow: '0 4px 16px rgba(124, 58, 237, 0.25)' }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default StudentSession;
