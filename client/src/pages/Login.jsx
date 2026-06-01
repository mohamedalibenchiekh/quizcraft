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

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendStatus, setResendStatus] = useState(''); // 'loading', 'success', 'error'
  const [resendMessage, setResendMessage] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(false);

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
    setVerificationRequired(false);
    setResendStatus('');
    setResendMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: form.email.trim(),
        password: form.password,
      });

      login(data.token, data.user);
      navigate(data.user.role === 'professor' ? '/dashboard' : '/student/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to sign in. Please try again.');
      if (err?.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setVerificationRequired(true);
      } else {
        setVerificationRequired(false);
        setResendStatus('');
        setResendMessage('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!form.email.trim()) return;
    setResendStatus('loading');
    setResendMessage('');
    try {
      const { data } = await api.post('/auth/resend-verification', { email: form.email.trim() });
      setResendStatus('success');
      setResendMessage(data.message || 'A new verification link has been sent to your inbox.');
    } catch (err) {
      setResendStatus('error');
      setResendMessage(err?.response?.data?.message || 'Failed to resend verification email.');
    }
  };

  const onResendClick = () => {
    setResendStatus('');
    setResendMessage('');
    handleResendVerification();
  };

  const handleGoogleSuccess = async (credentialResponse, selectedRole = null) => {
    setAuthLoading(true);
    try {
      setError('');
      const { data } = await api.post('/auth/google', {
        credential: credentialResponse.credential,
        role: selectedRole,
      });

      if (data.isNewUser) {
        // Pause login, cache the token, and prompt for their role
        setTempGoogleCredential(credentialResponse.credential);
        setShowRoleModal(true);
      } else if (data.token) {
        // Successful login/registration — clean up modal state only on success
        setTempGoogleCredential(null);
        setShowRoleModal(false);
        login(data.token, data.user);
        navigate(data.user.role === 'professor' ? '/dashboard' : '/student/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Google sign-in failed. Please try again.');
      setVerificationRequired(false);
      setResendStatus('');
      setResendMessage('');
      // Keep modal and credential cached so user can retry
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

    // Keep modal open and credential cached during the API call
    // The handleGoogleSuccess function will handle cleanup on success
    await handleGoogleSuccess({ credential: tempGoogleCredential }, role);
  };

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
            Welcome back to <span style={{ color: '#8b5cf6' }}>QuizCraft</span>
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to continue.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
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
              placeholder="professor@university.edu"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Password
              </label>
              <Link to="/forgot-password" className="text-xs font-semibold transition-colors duration-200" style={{ color: 'var(--color-brand-300)' }}>
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                className="block w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none transition-all duration-300"
                style={inputStyle}
                placeholder="••••••••"
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
              {verificationRequired ? (
                <div className="flex flex-col gap-2">
                  <p>{error}</p>
                  {resendStatus === 'success' && (
                    <p className="text-xs font-medium" style={{ color: '#6ee7b7' }}>{resendMessage}</p>
                  )}
                  <button
                    type="button"
                    onClick={onResendClick}
                    disabled={resendStatus === 'loading'}
                    className="text-left text-xs font-medium underline focus:outline-none transition-colors"
                    style={{ color: '#fca5a5' }}
                  >
                    {resendStatus === 'loading' ? 'Sending link...' : 'Click here to resend the verification link'}
                  </button>
                  {resendStatus === 'error' && (
                    <p className="text-xs font-medium" style={{ color: '#fca5a5' }}>{resendMessage}</p>
                  )}
                </div>
              ) : (
                error
              )}
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
            {submitting ? 'Signing in…' : 'Sign In'}
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
            onError={() => setError('Google sign-in was unsuccessful. Please try again.')}
            size="large"
            shape="rectangular"
            theme="outline"
            text="signin_with"
          />
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold transition-colors duration-200"
            style={{ color: 'var(--color-brand-300)' }}
          >
            Create one
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

export default Login;
