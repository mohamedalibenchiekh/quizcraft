import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import {
  Sparkles,
  Activity,
  CheckCircle,
  ArrowRight,
  Play,
  X,
  BrainCircuit,
  Trophy,
  GraduationCap,
  UploadCloud,
  Sliders,
  BarChart3,
  PlayCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

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
      const count = Math.min(220, Math.floor((canvas.width * canvas.height) / 15000));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 0.5,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          opacity: Math.random() * 0.6 + 0.15,
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

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.08 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
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
      style={{ opacity: 0.7 }}
    />
  );
};

/* ─────────────────────────────────────────────
   Capability Feature Card
   ───────────────────────────────────────────── */
// Per-accent class sets are written out in full so Tailwind can detect them
// (no string interpolation of color names). Tints use /10–/30 alphas so they
// read correctly on both the light and dark themes.
const ACCENTS = {
  cyan: {
    iconWrap: 'bg-cyan-500/10 border-cyan-500/20',
    icon: 'text-cyan-400',
    hoverBorder: 'hover:border-cyan-500/30',
    tag: 'text-cyan-500 group-hover:text-cyan-400',
    glow: 'from-cyan-500/5',
  },
  purple: {
    iconWrap: 'bg-purple-500/10 border-purple-500/20',
    icon: 'text-purple-400',
    hoverBorder: 'hover:border-purple-500/30',
    tag: 'text-purple-500 group-hover:text-purple-400',
    glow: 'from-purple-500/5',
  },
  emerald: {
    iconWrap: 'bg-emerald-500/10 border-emerald-500/20',
    icon: 'text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/30',
    tag: 'text-emerald-500 group-hover:text-emerald-400',
    glow: 'from-emerald-500/5',
  },
};

const FEATURES = [
  {
    accent: 'cyan',
    icon: Sparkles,
    title: 'Instant Document Ingestion',
    body: 'Turn raw course PDFs, presentation decks, or unformatted text files into highly granular, multi-format question pools in seconds. Our engine maps directly to target course syllabi with exact context alignment.',
    tag: 'Powered by LLM Context Mining',
  },
  {
    accent: 'purple',
    icon: Activity,
    title: 'Automated Remediation Decks',
    body: 'Say goodbye to standard uniform tests. The adaptive system catches specific user concept gaps and generates personalized recovery quiz decks to build student competence and target knowledge blockages.',
    tag: 'Cognitive Mastery Engine',
  },
  {
    accent: 'emerald',
    icon: CheckCircle,
    title: 'AI Short-Answer Evaluation',
    body: 'Completely bypass exact keyword matches. The platform evaluates semantic conceptual validity of student text submissions, offering fair partial-point scoring, clear logic rationales, and robust feedback.',
    tag: 'Semantic Embeddings Matcher',
  },
];

const FeatureCard = ({ accent, icon: Icon, title, body, tag }) => {
  const a = ACCENTS[accent];
  return (
    <div
      className={`group relative backdrop-blur-md border border-[var(--color-nav-border)] p-8 rounded-2xl transition-all duration-500 hover:translate-y-[-6px] ${a.hoverBorder} flex flex-col justify-between`}
      style={{ background: 'var(--color-surface-glass)' }}
    >
      <div>
        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${a.iconWrap}`}>
          <Icon className={`w-6 h-6 ${a.icon}`} />
        </div>
        <h3 className="text-xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {body}
        </p>
      </div>
      <span className={`text-xs font-bold flex items-center gap-1 transition-colors ${a.tag}`}>
        {tag} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </span>
      {/* Outer hover gradient light glow */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${a.glow} to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    </div>
  );
};

/* ─────────────────────────────────────────────
   Social-Proof Metric
   ───────────────────────────────────────────── */
const METRICS = [
  { icon: Trophy, iconColor: 'text-yellow-400', value: '15k+', label: 'Quizzes Generated' },
  { icon: CheckCircle, iconColor: 'text-emerald-400', value: '98%', label: 'Grading Evaluation Accuracy' },
  { icon: GraduationCap, iconColor: 'text-cyan-400', value: '3.5x', label: 'Student Mastery Speed' },
];

/* ─────────────────────────────────────────────
   Workflow Step Data & Card
   ───────────────────────────────────────────── */
const PROFESSOR_STEPS = [
  {
    step: '01',
    icon: UploadCloud,
    title: 'Ingest Learning Media',
    description: 'Upload study files, lecture slide PDFs, or text documents directly into the document ingestion area.',
  },
  {
    step: '02',
    icon: Sliders,
    title: 'Command the AI Matrix',
    description: 'Configure your exact parameter matrix distribution count by difficulty level, and write targeted custom prompt guidelines.',
  },
  {
    step: '03',
    icon: BarChart3,
    title: 'Publish & Track Insights',
    description: 'Instantly distribute evaluation keys, lock access limits, and view auto-aggregated class accuracy analytics reports.',
  },
];

const STUDENT_STEPS = [
  {
    step: '01',
    icon: PlayCircle,
    title: 'Launch Active App Engine',
    description: 'Access shared tests or personalized practice spaces directly from an interactive, high-performance clean testing layout.',
  },
  {
    step: '02',
    icon: CheckCircle2,
    title: 'Instant Smart Evaluation',
    description: 'Receive immediate grading responses. Open-ended short-form answers are evaluated via semantic AI logic to protect variation spelling accuracy.',
  },
  {
    step: '03',
    icon: RefreshCw,
    title: 'Trigger Adaptive Remediation',
    description: 'Scored below 50%? The adaptive difficulty engine automatically compiles custom secondary review decks to isolate and cure weak topics.',
  },
];

const WorkflowStepCard = ({ step, icon: Icon, title, description, accent }) => {
  const accentBorder = accent === 'cyan' ? 'hover:border-cyan-500/30' : 'hover:border-purple-500/30';
  const iconWrapBg = accent === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-purple-500/10 border-purple-500/20';
  const iconColor = accent === 'cyan' ? 'text-cyan-400' : 'text-purple-400';

  return (
    <div
      className={`group relative backdrop-blur-md border border-[var(--color-nav-border)] p-6 rounded-2xl transition-all duration-300 shadow-xl flex-1 w-full ${accentBorder}`}
      style={{ background: 'var(--color-surface-glass)' }}
    >
      <div className="absolute top-4 right-4 text-4xl font-black select-none font-mono opacity-20" style={{ color: 'var(--color-text-muted)' }}>
        {step}
      </div>
      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${iconWrapBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <h3 className="text-xl font-bold mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {description}
      </p>
    </div>
  );
};

const MetricItem = ({ icon: Icon, iconColor, value, label }) => (
  <div className="flex flex-col justify-center items-center p-4 hover:scale-105 transition-transform duration-300">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <span className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
    <span className="text-xs md:text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
      {label}
    </span>
  </div>
);

/* ─────────────────────────────────────────────
   Home Page Component
   ───────────────────────────────────────────── */
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessionCode, setSessionCode] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [activeRoleWorkflow, setActiveRoleWorkflow] = useState('professor');

  const handleProfessorPortal = () => {
    if (user) {
      navigate(user.role === 'professor' ? '/dashboard' : '/student/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    if (!sessionCode.trim()) {
      setSessionError('Please enter a session code.');
      return;
    }

    setIsValidating(true);
    setSessionError('');

    try {
      const response = await api.post('/sessions/verify', { code: sessionCode.trim() });

      if (response.data.success) {
        navigate(`/session/${sessionCode.trim()}`, { state: { roomCode: sessionCode.trim() } });
      }
    } catch (err) {
      setSessionError(err.response?.data?.message || 'Invalid session code. Try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    setSessionCode(value);
    if (sessionError) setSessionError('');
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  // Demo modal: close on Escape and lock body scroll while open
  useEffect(() => {
    if (!isDemoOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsDemoOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isDemoOpen]);

  return (
    <div
      className="relative min-h-screen font-sans"
      style={{ background: 'var(--color-surface-base)', color: 'var(--color-text-primary)' }}
    >
      <ParticleField />

      {/* Radial Glow Accents */}
      <div
        className="absolute top-[-250px] left-[-150px] w-[600px] h-[600px] rounded-full pointer-events-none z-0 filter blur-[120px]"
        style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 80%)' }}
      />
      <div
        className="absolute top-[20%] right-[-100px] w-[500px] h-[500px] rounded-full pointer-events-none z-0 filter blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 80%)' }}
      />
      <div
        className="absolute bottom-0 left-[15%] w-[600px] h-[600px] rounded-full pointer-events-none z-0 filter blur-[140px]"
        style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 80%)' }}
      />

      {/* Shared, theme-aware navbar (brings ThemeToggle + auth states) */}
      <div className="relative z-20">
        <Navbar />
      </div>

      {/* ─────────────────────────────────────
           SECTION A: THE MODERN SAAS HERO LAYER
         ───────────────────────────────────── */}
      <section className="relative z-10 pt-16 pb-12 md:pt-28 md:pb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Elite Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-fade-in-up"
              style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-cyan-500">
                AI-Powered Adaptive Assessment Ecosystem
              </span>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[5rem] font-black leading-[1.1] tracking-tight mb-8 animate-fade-in-up"
              style={{
                fontFamily: 'var(--font-display)',
                animationDelay: '100ms',
              }}
            >
              Elevate Assessments with{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-purple-500 bg-clip-text text-transparent">
                Adaptive AI Intelligence.
              </span>
            </h1>

            {/* Subheadline (Double Persona Context) */}
            <p
              className="text-base sm:text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
              style={{
                color: 'var(--color-text-secondary)',
                animationDelay: '200ms',
              }}
            >
              Empowering professors to instantly auto-generate deep multi-format quizzes, while matching student struggles in real-time with automatic AI adaptive remediation tracks.
            </p>

            {/* Grid Split CTA Row */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
            >
              <button
                id="hero-professor-portal"
                onClick={handleProfessorPortal}
                className="group relative px-8 py-4 rounded-xl text-base font-bold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-2xl w-full sm:w-auto flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--color-brand-400), var(--color-brand-500))',
                  color: '#fff',
                  boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
                }}
              >
                Professor Portal
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </button>

              <button
                id="hero-join-session"
                onClick={() => document.getElementById('room-code-input')?.focus()}
                className="group px-8 py-4 rounded-xl text-base font-bold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] w-full sm:w-auto flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  color: 'var(--color-brand-400)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                Join Live Session
              </button>

              <button
                onClick={() => setIsDemoOpen(true)}
                className="group px-8 py-4 rounded-xl text-base font-bold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] w-full sm:w-auto flex items-center justify-center gap-2"
                style={{
                  background: 'var(--color-surface-glass)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-nav-border)',
                }}
              >
                <Play className="w-4 h-4 group-hover:scale-110 transition-transform" style={{ fill: 'currentColor' }} />
                Watch Demo
              </button>
            </div>

            {/* ─── Student Live Room Quick Join Interceptor ─── */}
            <div
              className="relative max-w-lg mx-auto animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <div
                className="backdrop-blur-xl border border-purple-500/20 p-6 sm:p-8 rounded-2xl"
                style={{
                  background: 'var(--color-surface-glass)',
                  boxShadow: isCodeFocused
                    ? '0 0 45px rgba(139, 92, 246, 0.25), 0 8px 32px rgba(0,0,0,0.25)'
                    : '0 8px 32px rgba(0,0,0,0.18)',
                  transition: 'all 0.4s ease',
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-500">
                    Live Session quick join
                  </span>
                </div>

                <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                  Enter a 6-character room code from your professor to instantly join a real-time live session.
                </p>

                <form onSubmit={handleJoinSession} className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        id="room-code-input"
                        type="text"
                        inputMode="text"
                        pattern="[A-Za-z0-9]*"
                        maxLength={6}
                        value={sessionCode}
                        onChange={handleCodeChange}
                        onKeyDown={handleCodeKeyDown}
                        onFocus={() => setIsCodeFocused(true)}
                        onBlur={() => setIsCodeFocused(false)}
                        disabled={isValidating}
                        placeholder="ABC123"
                        className="w-full px-4 py-3.5 rounded-xl text-center text-xl font-mono font-bold tracking-[0.25em] outline-none transition-all duration-300"
                        style={{
                          background: 'var(--color-surface-input)',
                          color: 'var(--color-text-primary)',
                          border: isCodeFocused
                            ? '2px solid rgba(139, 92, 246, 0.7)'
                            : '2px solid rgba(139, 92, 246, 0.2)',
                          caretColor: 'var(--color-brand-400)',
                        }}
                      />
                      <div
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                        style={{ color: sessionCode.length === 6 ? '#34d399' : 'var(--color-text-muted)' }}
                      >
                        {sessionCode.length}/6
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isValidating || sessionCode.trim().length !== 6}
                      className="px-6 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-[-2px]"
                      style={{
                        background: sessionCode.length === 6
                          ? 'linear-gradient(135deg, #10b981, #059669)'
                          : 'rgba(16, 185, 129, 0.15)',
                        color: sessionCode.length === 6 ? '#fff' : '#10b981',
                        border: sessionCode.length === 6
                          ? 'none'
                          : '1px solid rgba(16, 185, 129, 0.25)',
                        boxShadow: sessionCode.length === 6 ? '0 6px 20px rgba(16, 185, 129, 0.3)' : 'none',
                      }}
                    >
                      {isValidating ? 'Joining…' : 'Join'}
                    </button>
                  </div>

                  {sessionError && (
                    <p className="mt-1 text-xs font-medium text-red-400 animate-fadeIn">
                      ⚠️ {sessionError}
                    </p>
                  )}
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
           SECTION B': SPLIT-PERSONA WORKFLOW CLARIFICATION
         ───────────────────────────────────── */}
      <section className="relative z-10 py-24 md:py-36 border-t border-b border-purple-500/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Section Accent Header */}
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-bold uppercase tracking-widest mb-3 text-cyan-500">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Tailored Experience for Creators &amp; Learners
            </h2>
            <p className="max-w-2xl mx-auto text-base sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              Choose an ecosystem to explore how QuizCraft automates assessment creation and accelerates student knowledge retention.
            </p>
          </div>

          {/* Interactive Pill Toggle */}
          <div className="flex justify-center mb-16">
            <div className="inline-flex p-1 rounded-full" style={{ background: 'var(--color-surface-glass)', border: '1px solid var(--color-nav-border)' }}>
              <button
                onClick={() => setActiveRoleWorkflow('professor')}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 cursor-pointer ${
                  activeRoleWorkflow === 'professor'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'border border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Professor
              </button>
              <button
                onClick={() => setActiveRoleWorkflow('student')}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 cursor-pointer ${
                  activeRoleWorkflow === 'student'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'border border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                Student
              </button>
            </div>
          </div>

          {/* Dynamic Workflow Cards */}
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-4 lg:gap-8">
            {(activeRoleWorkflow === 'professor' ? PROFESSOR_STEPS : STUDENT_STEPS).map((step, index) => {
              const accent = activeRoleWorkflow === 'professor' ? 'cyan' : 'purple';
              return (
                <div key={step.step} className="flex-1 w-full flex items-stretch">
                  <WorkflowStepCard {...step} accent={accent} />
                  {index < 2 && (
                    <div className="hidden md:flex items-center self-center mx-2" style={{ color: 'var(--color-text-muted)', opacity: 0.5 }}>
                      <ArrowRight className="w-6 h-6 shrink-0" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
           SECTION C: COMPREHENSIVE CAPABILITIES GRID (3 Columns)
         ───────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 md:py-36 border-t border-b border-purple-500/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Section Title Header */}
          <div className="text-center mb-20">
            <span className="inline-block text-xs font-bold uppercase tracking-widest mb-3 text-cyan-500">
              State-of-the-Art Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Engineered for Deep Learning.
            </h2>
            <p className="max-w-2xl mx-auto text-base sm:text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              QuizCraft leverages high-fidelity AI models to fully synthesize core syllabus structures, drive automated memory retention, and handle open grading pipelines.
            </p>
          </div>

          {/* 3-Column Capabilities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
           SECTION C: SOCIAL PROOF & METRIC METADATA STRIP
         ───────────────────────────────────── */}
      <section className="relative z-10 py-16 border-b border-purple-500/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div
            className="border border-purple-500/10 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl"
            style={{ background: 'var(--color-surface-glass)' }}
          >
            {/* Interactive Glow Behind Metrics */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-[80px] bg-purple-500/5 rounded-full blur-[40px]" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-purple-500/15 text-center relative z-10">
              {METRICS.map((metric) => (
                <MetricItem key={metric.label} {...metric} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Premium Call-To-Action Banner Section ─── */}
      <section className="relative z-10 py-24 md:py-36">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Empower Your Classroom Learning Ecosystem.
          </h2>
          <p className="text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Join thousands of modern universities and premium educators leveraging intelligent adaptive grading engines to supercharge user success metrics.
          </p>
          <button
            onClick={handleSignup}
            className="group px-10 py-5 rounded-xl text-base font-bold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-2xl inline-flex items-center gap-2.5"
            style={{
              background: 'linear-gradient(135deg, var(--color-brand-400), var(--color-brand-500))',
              color: '#fff',
              boxShadow: '0 8px 32px rgba(124, 58, 237, 0.4)',
            }}
          >
            Create Your Instructor Account
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* ─── Footer Section ─── */}
      <footer className="relative z-10 border-t border-purple-500/10 py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
              Designed &amp; Developed by{' '}
              <a
                href="https://github.com/mohamedalibenchiekh"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:text-cyan-400 transition-colors duration-200 flex items-center gap-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Mohamed Ali Ben Cheikh
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </span>
            <div className="flex gap-6 text-sm">
              <a href="#features" className="hover:text-cyan-400 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                Features
              </a>
              <Link to="/login" className="hover:text-cyan-400 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                Sign In
              </Link>
              <Link to="/signup" className="hover:text-cyan-400 transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────
           Interactive Demo Video Modal
         ───────────────────────────────────── */}
      {isDemoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all"
          onClick={() => setIsDemoOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl border border-[var(--color-nav-border)] rounded-3xl p-4 sm:p-6 shadow-2xl animate-fade-in-up"
            style={{ background: 'var(--color-surface-card)' }}
          >

            {/* Close Button */}
            <button
              onClick={() => setIsDemoOpen(false)}
              aria-label="Close demo"
              className="absolute top-4 right-4 hover:opacity-80 bg-black/5 dark:bg-white/5 p-2.5 rounded-full transition-all cursor-pointer"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="mb-4 pr-12">
              <h3 id="demo-modal-title" className="text-lg font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                <Sparkles className="w-5 h-5 text-cyan-400" />
                QuizCraft Interactive Walkthrough
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                See how easy it is to automatically generate deep adaptive quizzes and grade them semantically.
              </p>
            </div>

            {/* Video Mockup Interface */}
            <div
              className="relative w-full aspect-video rounded-2xl overflow-hidden border border-[var(--color-nav-border)] flex flex-col items-center justify-center p-8 text-center"
              style={{ background: 'var(--color-surface-base)' }}
            >
              {/* SVG Mockup UI Elements */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_70%)] pointer-events-none" />

              <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center mb-6 shadow-2xl">
                <BrainCircuit className="w-10 h-10 text-purple-400 animate-pulse" />
              </div>

              <h4 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                QuizCraft System Simulation
              </h4>
              <p className="text-sm max-w-md mx-auto mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Our team is currently finalizing our video recording. In the meantime, launch a free account to test all features live immediately!
              </p>

              <button
                onClick={() => {
                  setIsDemoOpen(false);
                  handleSignup();
                }}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all bg-gradient-to-r from-cyan-500 to-purple-500 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                Launch Live Playground
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
