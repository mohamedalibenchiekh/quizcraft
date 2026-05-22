import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─────────────────────────────────────────────
   Inline SVG Icon Components
   ───────────────────────────────────────────── */

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
  </svg>
);

const BoltIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const BrainIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" />
    <path d="M9 21h6M10 17v4M14 17v4" />
    <path d="M12 2v4M8 5l2 2M16 5l-2 2" />
  </svg>
);

const ArrowRightIcon = ({ className = 'w-5 h-5' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const GamepadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
  </svg>
);

/* ─────────────────────────────────────────────
   Animated Background Particles
   ───────────────────────────────────────────── */

const ParticleField = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.opacity})`;
        ctx.fill();
      });

      // Draw connections between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139, 92, 246, ${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();

    const handleResize = () => {
      resize();
      createParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};

/* ─────────────────────────────────────────────
   Feature Card Component
   ───────────────────────────────────────────── */

const FeatureCard = ({ icon, title, description, gradient, delay }) => (
  <div
    className="group relative p-px rounded-2xl animate-fade-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    {/* Gradient border on hover */}
    <div
      className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{
        background: gradient,
        padding: '1px',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        WebkitMaskComposite: 'xor',
      }}
    />

    <div
      className="relative rounded-2xl p-8 h-full transition-all duration-500 group-hover:translate-y-[-4px]"
      style={{
        background: 'var(--color-surface-card)',
        border: '1px solid rgba(139, 92, 246, 0.12)',
      }}
    >
      {/* Icon container */}
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110"
        style={{ background: gradient }}
      >
        <span className="text-white">{icon}</span>
      </div>

      <h3
        className="text-xl font-semibold mb-3"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
      >
        {title}
      </h3>

      <p
        className="leading-relaxed text-sm"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {description}
      </p>

      {/* Hover glow */}
      <div
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-16 opacity-0 group-hover:opacity-30 transition-opacity duration-500 blur-2xl"
        style={{ background: gradient }}
      />
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   Main Home Page Component
   ───────────────────────────────────────────── */

const Home = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [isCodeFocused, setIsCodeFocused] = useState(false);

  const handleProfessorPortal = () => {
    navigate('/login');
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  const handleJoinSession = () => {
    if (roomCode.length === 6) {
      navigate('/session', { state: { roomCode } });
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setRoomCode(value);
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleJoinSession();
    }
  };

  const features = [
    {
      icon: <SparklesIcon />,
      title: 'AI Auto-Generation',
      description:
        'Upload your PDFs, DOCX, or presentation files and let our AI engine instantly extract and craft high-quality quiz questions — complete with difficulty labels, categories, and answer explanations.',
      gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    },
    {
      icon: <BoltIcon />,
      title: 'Real-Time Sessions',
      description:
        'Launch live Kahoot-style quiz sessions with real-time WebSocket tracking. Watch student responses stream in live, see instant leaderboards, and keep the energy high with timed question rounds.',
      gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    },
    {
      icon: <BrainIcon />,
      title: 'Adaptive Learning Engine',
      description:
        'Our intelligent engine analyzes student scoring profiles in real-time and automatically adjusts question difficulty — surfacing harder questions for top performers and reinforcing fundamentals for those who need support.',
      gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--color-surface-base)' }}>
      <ParticleField />

      {/* ─── Radial Glow Accents ─── */}
      <div
        className="absolute top-[-300px] left-[-200px] w-[700px] h-[700px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)' }}
      />

      {/* ─────────────────────────────────────
           Navigation Bar
         ───────────────────────────────────── */}
      <nav className="relative z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Quiz<span style={{ color: '#8b5cf6' }}>Craft</span>
              </span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-6">
              <a
                href="#features"
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Features
              </a>
              <button
                id="nav-login"
                onClick={handleProfessorPortal}
                className="text-sm font-medium transition-colors duration-200 cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Login
              </button>
              <button
                id="nav-signup"
                onClick={handleSignup}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer hover:translate-y-[-1px] hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ─────────────────────────────────────
           Hero Section
         ───────────────────────────────────── */}
      <section className="relative z-10 pt-12 pb-8 md:pt-20 md:pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-fade-in-up"
              style={{
                background: 'rgba(139, 92, 246, 0.12)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-accent-green-400 animate-pulse" />
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--color-brand-300)' }}>
                AI-Powered Education Platform
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6 animate-fade-in-up"
              style={{
                fontFamily: 'var(--font-display)',
                animationDelay: '100ms',
              }}
            >
              <span style={{ color: 'var(--color-text-primary)' }}>Transform Course{' '}</span>
              <br className="hidden sm:block" />
              <span style={{ color: 'var(--color-text-primary)' }}>Materials into </span>
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #8b5cf6, #22d3ee, #4ade80)',
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 4s ease infinite',
                }}
              >
                Interactive Quizzes
              </span>
              <br />
              <span style={{ color: 'var(--color-text-primary)' }}>in Seconds</span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
              style={{
                color: 'var(--color-text-secondary)',
                animationDelay: '200ms',
              }}
            >
              Harness the power of AI to automatically generate quizzes from your lecture notes, PDFs, and documents.
              Engage students with real-time interactive sessions and adaptive learning paths.
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
            >
              <button
                id="hero-professor-portal"
                onClick={handleProfessorPortal}
                className="group relative px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-2xl w-full sm:w-auto flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(124, 58, 237, 0.35)',
                }}
              >
                Professor Portal
                <ArrowRightIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>

              <button
                id="hero-join-session"
                onClick={() => document.getElementById('room-code-input')?.focus()}
                className="group px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] w-full sm:w-auto flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: 'var(--color-brand-300)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                <GamepadIcon />
                Join Live Session
              </button>
            </div>

            {/* ─── Student Live Room Interceptor ─── */}
            <div
              className="relative max-w-lg mx-auto animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <div
                className="glass-card p-6 sm:p-8"
                style={{
                  boxShadow: isCodeFocused
                    ? '0 0 40px rgba(124, 58, 237, 0.25), 0 8px 32px rgba(0,0,0,0.3)'
                    : '0 8px 32px rgba(0,0,0,0.2)',
                  transition: 'box-shadow 0.4s ease',
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <GamepadIcon />
                  <span
                    className="text-sm font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-accent-400)' }}
                  >
                    Quick Join
                  </span>
                </div>

                <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                  Got a room code from your professor? Jump straight into the live session — no account needed.
                </p>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      id="room-code-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={roomCode}
                      onChange={handleCodeChange}
                      onKeyDown={handleCodeKeyDown}
                      onFocus={() => setIsCodeFocused(true)}
                      onBlur={() => setIsCodeFocused(false)}
                      placeholder="000000"
                      className="w-full px-4 py-3.5 rounded-xl text-center text-xl font-mono font-bold tracking-[0.3em] outline-none transition-all duration-300 placeholder:text-text-muted"
                      style={{
                        background: 'var(--color-surface-input)',
                        color: 'var(--color-text-primary)',
                        border: isCodeFocused
                          ? '2px solid rgba(139, 92, 246, 0.6)'
                          : '2px solid rgba(139, 92, 246, 0.15)',
                        caretColor: '#8b5cf6',
                      }}
                    />
                    {/* Character count indicator */}
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                      style={{ color: roomCode.length === 6 ? '#4ade80' : 'var(--color-text-muted)' }}
                    >
                      {roomCode.length}/6
                    </div>
                  </div>

                  <button
                    id="join-game-button"
                    onClick={handleJoinSession}
                    disabled={roomCode.length !== 6}
                    className="px-6 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-[-2px] hover:shadow-lg"
                    style={{
                      background: roomCode.length === 6
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'rgba(34, 197, 94, 0.15)',
                      color: roomCode.length === 6 ? '#fff' : 'var(--color-accent-green-400)',
                      border: roomCode.length === 6
                        ? 'none'
                        : '1px solid rgba(34, 197, 94, 0.2)',
                      boxShadow: roomCode.length === 6 ? '0 8px 24px rgba(34, 197, 94, 0.3)' : 'none',
                    }}
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
           Features Grid
         ───────────────────────────────────── */}
      <section id="features" className="relative z-10 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: 'var(--color-brand-400)' }}
            >
              Why QuizCraft?
            </span>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
            >
              Everything You Need to{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #8b5cf6, #22d3ee)' }}>
                Engage
              </span>
            </h2>
            <p
              className="max-w-xl mx-auto text-base"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              From AI-powered quiz creation to real-time student engagement — QuizCraft empowers educators with cutting-edge tools.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                gradient={feature.gradient}
                delay={500 + index * 150}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
           Bottom CTA Banner
         ───────────────────────────────────── */}
      <section className="relative z-10 pb-20 md:pb-32">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <div
            className="relative rounded-3xl p-10 md:p-14 text-center overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.08))',
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}
          >
            {/* Decorative glow */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, #8b5cf6, #22d3ee, transparent)' }}
            />

            <h2
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
            >
              Ready to Revolutionize Your Classroom?
            </h2>
            <p
              className="text-base md:text-lg max-w-xl mx-auto mb-8"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Join thousands of educators transforming their teaching with AI-powered quizzes and real-time student engagement.
            </p>
            <button
              id="cta-get-started"
              onClick={handleSignup}
              className="group px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-2xl inline-flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                boxShadow: '0 8px 32px rgba(124, 58, 237, 0.35)',
              }}
            >
              Get Started Free
              <ArrowRightIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
           Footer
         ───────────────────────────────────── */}
      <footer className="relative z-10 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
            style={{ borderTop: '1px solid rgba(139, 92, 246, 0.1)' }}
          >
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              © {new Date().getFullYear()} QuizCraft. Crafted for modern education.
            </span>
            <div className="flex gap-6">
              <a href="#features" className="text-sm transition-colors duration-200" style={{ color: 'var(--color-text-muted)' }}>
                Features
              </a>
              <button
                onClick={handleProfessorPortal}
                className="text-sm transition-colors duration-200 cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Sign In
              </button>
              <button
                onClick={handleSignup}
                className="text-sm transition-colors duration-200 cursor-pointer bg-transparent border-none"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
