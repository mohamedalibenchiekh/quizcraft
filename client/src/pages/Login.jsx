import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
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
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
    } finally {
      setSubmitting(false);
    }
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
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Forgot password?
              </span>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              className="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
              style={inputStyle}
              placeholder="••••••••"
            />
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
            {submitting ? 'Signing in…' : 'Sign In'}
            {!submitting && <ArrowRightIcon />}
          </button>
        </form>

        <p className="text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Don&apos;t have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold transition-colors duration-200"
            style={{ color: 'var(--color-brand-300)' }}
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
