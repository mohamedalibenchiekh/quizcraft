import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  Activity, 
  CheckCircle, 
  ArrowRight, 
  Play, 
  X, 
  BrainCircuit, 
  User, 
  ShieldAlert, 
  Trophy,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
   Home Page Component
   ───────────────────────────────────────────── */
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);

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
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    setRoomCode(value);
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleJoinSession();
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
    <div className="relative min-h-screen text-slate-100 overflow-x-hidden font-sans" style={{ background: '#090514' }}>
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
        className="absolute bottom-[-150px] left-[15%] w-[600px] h-[600px] rounded-full pointer-events-none z-0 filter blur-[140px]"
        style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 80%)' }}
      />

      {/* ─── Premium Landing Page Custom Navbar ─── */}
      <nav className="relative z-20 border-b border-purple-500/10 backdrop-blur-md bg-[#090514]/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo Integration */}
            <Link
              to="/"
              aria-label="QuizCraft home"
              className="flex items-center gap-2.5 group transition-all duration-300 hover:opacity-95"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-[0_2px_12px_rgba(139,92,246,0.2)] group-hover:shadow-[0_4px_18px_rgba(139,92,246,0.35)]"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                }}
              >
                <BrainCircuit className="w-5.5 h-5.5 text-white" />
              </div>
              <span
                className="text-2xl font-black tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Quiz<span style={{ color: '#8b5cf6' }}>Craft</span>
              </span>
            </Link>

            {/* Nav Menu Links */}
            <div className="flex items-center gap-4 sm:gap-6">
              <a
                href="#features"
                className="text-sm font-medium hover:text-cyan-400 transition-colors duration-200 hidden sm:inline-block"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Features
              </a>
              {user ? (
                <Link
                  to={user.role === 'professor' ? '/dashboard' : '/student/dashboard'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer bg-white/5 border border-white/10 hover:bg-white/10"
                >
                  <User className="w-4 h-4 text-purple-400" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleProfessorPortal}
                    className="text-sm font-semibold transition-colors duration-200 cursor-pointer hover:text-white"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Login
                  </button>
                  <button
                    onClick={handleSignup}
                    className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-lg shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:shadow-purple-500/20"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      color: '#fff',
                    }}
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

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
              <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-cyan-300">
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
              className="text-base sm:text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed text-slate-300 animate-fade-in-up"
              style={{
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
                onClick={user ? () => navigate(user.role === 'professor' ? '/dashboard' : '/student/dashboard') : handleProfessorPortal}
                className="group relative px-8 py-4 rounded-xl text-base font-bold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-2xl w-full sm:w-auto flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
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
                  color: 'var(--color-brand-300)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                Join Live Session
              </button>

              <button
                onClick={() => setIsDemoOpen(true)}
                className="group px-8 py-4 rounded-xl text-base font-bold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:bg-white/10 w-full sm:w-auto flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Play className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
                Watch Demo
              </button>
            </div>

            {/* ─── Student Live Room Quick Join Interceptor ─── */}
            <div
              className="relative max-w-lg mx-auto animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <div
                className="bg-slate-950/60 backdrop-blur-xl border border-purple-500/20 p-6 sm:p-8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                style={{
                  boxShadow: isCodeFocused
                    ? '0 0 45px rgba(139, 92, 246, 0.25), 0 8px 32px rgba(0,0,0,0.6)'
                    : '0 8px 32px rgba(0,0,0,0.4)',
                  transition: 'all 0.4s ease',
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Live Session quick join
                  </span>
                </div>

                <p className="text-sm mb-5 text-slate-400">
                  Enter a 6-character room code from your professor to instantly join a real-time live session.
                </p>

                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      id="room-code-input"
                      type="text"
                      inputMode="text"
                      pattern="[A-Za-z0-9]*"
                      maxLength={6}
                      value={roomCode}
                      onChange={handleCodeChange}
                      onKeyDown={handleCodeKeyDown}
                      onFocus={() => setIsCodeFocused(true)}
                      onBlur={() => setIsCodeFocused(false)}
                      placeholder="ABC123"
                      className="w-full px-4 py-3.5 rounded-xl text-center text-xl font-mono font-bold tracking-[0.25em] outline-none transition-all duration-300"
                      style={{
                        background: 'rgba(9, 5, 20, 0.7)',
                        color: '#f8f7ff',
                        border: isCodeFocused
                          ? '2px solid rgba(139, 92, 246, 0.7)'
                          : '2px solid rgba(139, 92, 246, 0.2)',
                        caretColor: '#8b5cf6',
                      }}
                    />
                    <div
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold"
                      style={{ color: roomCode.length === 6 ? '#34d399' : '#6b6480' }}
                    >
                      {roomCode.length}/6
                    </div>
                  </div>

                  <button
                    onClick={handleJoinSession}
                    disabled={roomCode.length !== 6}
                    className="px-6 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:translate-y-[-2px]"
                    style={{
                      background: roomCode.length === 6
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'rgba(16, 185, 129, 0.15)',
                      color: roomCode.length === 6 ? '#fff' : '#10b981',
                      border: roomCode.length === 6
                        ? 'none'
                        : '1px solid rgba(16, 185, 129, 0.25)',
                      boxShadow: roomCode.length === 6 ? '0 6px 20px rgba(16, 185, 129, 0.3)' : 'none',
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
           SECTION B: COMPREHENSIVE CAPABILITIES GRID (3 Columns)
         ───────────────────────────────────── */}
      <section id="features" className="relative z-10 py-24 md:py-36 bg-[#090514]/40 border-t border-b border-purple-500/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          {/* Section Title Header */}
          <div className="text-center mb-20">
            <span className="inline-block text-xs font-bold uppercase tracking-widest mb-3 text-cyan-400">
              State-of-the-Art Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Engineered for Deep Learning.
            </h2>
            <p className="max-w-2xl mx-auto text-slate-400 text-base sm:text-lg">
              QuizCraft leverages high-fidelity AI models to fully synthesize core syllabus structures, drive automated memory retention, and handle open grading pipelines.
            </p>
          </div>

          {/* 3-Column Capabilities Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1 (AI Context Processing) */}
            <div className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-8 rounded-2xl transition-all duration-500 hover:translate-y-[-6px] hover:border-cyan-500/30 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold mb-4 tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  Instant Document Ingestion
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Turn raw course PDFs, presentation decks, or unformatted text files into highly granular, multi-format question pools in seconds. Our engine maps directly to target course syllabi with exact context alignment.
                </p>
              </div>
              <span className="text-xs font-bold text-cyan-400/80 flex items-center gap-1 group-hover:text-cyan-300">
                Powered by LLM Context Mining <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
              {/* Outer hover gradient light glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Card 2 (Adaptive Learning Matrix) */}
            <div className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-8 rounded-2xl transition-all duration-500 hover:translate-y-[-6px] hover:border-purple-500/30 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-4 tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  Automated Remediation Decks
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Say goodbye to standard uniform tests. The adaptive system catches specific user concept gaps and generates personalized recovery quiz decks to build student competence and target knowledge blockages.
                </p>
              </div>
              <span className="text-xs font-bold text-purple-400/80 flex items-center gap-1 group-hover:text-purple-300">
                Cognitive Mastery Engine <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Card 3 (Semantic Smart Grading) */}
            <div className="group relative bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-8 rounded-2xl transition-all duration-500 hover:translate-y-[-6px] hover:border-emerald-500/30 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-4 tracking-tight text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  AI Short-Answer Evaluation
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Completely bypass exact keyword matches. The platform evaluates semantic conceptual validity of student text submissions, offering fair partial-point scoring, clear logic rationales, and robust feedback.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-400/80 flex items-center gap-1 group-hover:text-emerald-300">
                Semantic Embeddings Matcher <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────
           SECTION C: SOCIAL PROOF & METRIC METADATA STRIP
         ───────────────────────────────────── */}
      <section className="relative z-10 py-16 bg-[#070310] border-b border-purple-500/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-[#0e071e]/40 border border-purple-500/10 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
            {/* Interactive Glow Behind Metrics */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-[80px] bg-purple-500/5 rounded-full blur-[40px]" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-purple-500/15 text-center relative z-10">
              
              {/* Metric 1 */}
              <div className="flex flex-col justify-center items-center p-4 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-4xl md:text-5xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    15k+
                  </span>
                </div>
                <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400">
                  Quizzes Generated
                </span>
              </div>

              {/* Metric 2 */}
              <div className="flex flex-col justify-center items-center p-4 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-4xl md:text-5xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    98%
                  </span>
                </div>
                <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400">
                  Grading Evaluation Accuracy
                </span>
              </div>

              {/* Metric 3 */}
              <div className="flex flex-col justify-center items-center p-4 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  <span className="text-4xl md:text-5xl font-black text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    3.5x
                  </span>
                </div>
                <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-400">
                  Student Mastery Speed
                </span>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ─── Premium Call-To-Action Banner Section ─── */}
      <section className="relative z-10 py-24 md:py-36">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-6 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Empower Your Classroom Learning Ecosystem.
          </h2>
          <p className="text-slate-300 text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of modern universities and premium educators leveraging intelligent adaptive grading engines to supercharge user success metrics.
          </p>
          <button
            onClick={handleSignup}
            className="group px-10 py-5 rounded-xl text-base font-bold transition-all duration-300 cursor-pointer hover:translate-y-[-2px] hover:shadow-2xl inline-flex items-center gap-2.5"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
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
      <footer className="relative z-10 border-t border-purple-500/10 py-12 bg-[#06030d]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <span className="text-sm text-slate-500">
              © {new Date().getFullYear()} QuizCraft Inc. Engineered for next-gen academic institutions.
            </span>
            <div className="flex gap-6 text-sm">
              <a href="#features" className="text-slate-400 hover:text-cyan-400 transition-colors">
                Features
              </a>
              <Link to="/login" className="text-slate-400 hover:text-cyan-400 transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="text-slate-400 hover:text-cyan-400 transition-colors">
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
            className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl animate-fade-in-up"
          >

            {/* Close Button */}
            <button
              onClick={() => setIsDemoOpen(false)}
              aria-label="Close demo"
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="mb-4 pr-12">
              <h3 id="demo-modal-title" className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
                <Sparkles className="w-5 h-5 text-cyan-400" />
                QuizCraft Interactive Walkthrough
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                See how easy it is to automatically generate deep adaptive quizzes and grade them semantically.
              </p>
            </div>

            {/* Video Mockup Interface */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-8 text-center">
              {/* SVG Mockup UI Elements */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_70%)] pointer-events-none" />
              
              <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/40 flex items-center justify-center mb-6 shadow-2xl">
                <BrainCircuit className="w-10 h-10 text-purple-400 animate-pulse" />
              </div>

              <h4 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                QuizCraft System Simulation
              </h4>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
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
