import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const GraduationCapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const inputStyle = {
  background: 'var(--color-surface-input)',
  color: 'var(--color-text-primary)',
  border: '1px solid rgba(139, 92, 246, 0.15)',
};

const Signup = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Google OAuth role selection state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [tempGoogleCredential, setTempGoogleCredential] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setRegistered(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse, selectedRole = null) => {
    setAuthLoading(true);
    try {
      setError('');
      const { data } = await api.post('/auth/google', {
        credential: credentialResponse.credential,
        role: selectedRole || form.role,
      });

      if (data.isNewUser) {
        // Pause login, cache the token, and prompt for their role
        setTempGoogleCredential(credentialResponse.credential);
        setShowRoleModal(true);
      } else if (data.token) {
        // Standard successful login/registration processing
        login(data.token, data.user);
        navigate(data.user.role === 'professor' ? '/dashboard' : '/student/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Google sign-up failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRoleSelection = async (role) => {
    if (!tempGoogleCredential) {
      setError('Authentication error. Please try again.');
      setShowRoleModal(false);
      return;
    }

    setShowRoleModal(false);
    setTempGoogleCredential(null);
    await handleGoogleSuccess({ credential: tempGoogleCredential }, role);
  };

  if (registered) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div
          className="w-full max-w-md p-8 space-y-6 rounded-2xl text-center"
          style={{
            background: 'var(--color-surface-card)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2
            className="text-2xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Account Created!
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            We&apos;ve sent a verification link to <strong>{form.email}</strong>.
            Please check your inbox and verify your email to log in.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-xl transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff',
            }}
          >
            Go to Login
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
      <div
        className="w-full max-w-md p-8 space-y-6 rounded-2xl"
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium mb-6 transition-colors duration-200"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <ArrowLeftIcon />
            Back to Home
          </Link>
          <h2
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Create your <span style={{ color: '#8b5cf6' }}>QuizCraft</span> account
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Get started in seconds — no credit card required.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              autoComplete="name"
              className="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
              style={inputStyle}
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              className="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
              style={inputStyle}
              placeholder="jane@university.edu"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                className="block w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none transition-all duration-300"
                style={inputStyle}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                className="block w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none transition-all duration-300"
                style={inputStyle}
                placeholder="Repeat your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              I am a
            </label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleChange}
              className="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 cursor-pointer"
              style={inputStyle}
            >
              <option value="student">Student</option>
              <option value="professor">Professor</option>
            </select>
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
            }}
          >
            {submitting ? 'Creating account…' : 'Create Account'}
            {!submitting && <ArrowRightIcon />}
          </button>
        </form>

        <div className="relative flex items-center">
          <div className="flex-grow border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.15)' }} />
          <span className="flex-shrink mx-4 text-xs font-semibold uppercase" style={{ color: 'var(--color-text-muted)' }}>or</span>
          <div className="flex-grow border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.15)' }} />
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-up was unsuccessful. Please try again.')}
            size="large"
            shape="rectangular"
            theme="outline"
            text="signup_with"
          />
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold transition-colors duration-200"
            style={{ color: 'var(--color-brand-300)' }}
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Role Selection Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md p-8 rounded-2xl space-y-6"
            style={{
              background: 'var(--color-surface-card)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <div className="text-center">
              <h3
                className="text-2xl font-extrabold tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Welcome to QuizCraft!
              </h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                To complete your registration, please select your role:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Option */}
              <button
                onClick={() => handleRoleSelection('student')}
                disabled={authLoading}
                className="group flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-violet-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'rgba(139, 92, 246, 0.05)',
                }}
              >
                <div
                  className="mb-4 p-4 rounded-full transition-colors duration-300 group-hover:bg-violet-500/20"
                  style={{ color: '#8b5cf6' }}
                >
                  <GraduationCapIcon />
                </div>
                <span
                  className="text-lg font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Student
                </span>
                <span
                  className="text-xs mt-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Take quizzes and track progress
                </span>
              </button>

              {/* Professor Option */}
              <button
                onClick={() => handleRoleSelection('professor')}
                disabled={authLoading}
                className="group flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-violet-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  background: 'rgba(139, 92, 246, 0.05)',
                }}
              >
                <div
                  className="mb-4 p-4 rounded-full transition-colors duration-300 group-hover:bg-violet-500/20"
                  style={{ color: '#8b5cf6' }}
                >
                  <BookOpenIcon />
                </div>
                <span
                  className="text-lg font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Professor
                </span>
                <span
                  className="text-xs mt-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Create and manage quizzes
                </span>
              </button>
            </div>

            {authLoading && (
              <div className="text-center">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Creating your account...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;
