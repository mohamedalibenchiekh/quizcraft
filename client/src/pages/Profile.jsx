import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

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

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const inputStyle = {
  background: 'var(--color-surface-input)',
  color: 'var(--color-text-primary)',
  border: '1px solid rgba(139, 92, 246, 0.15)',
};

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/users/profile/stats');
        if (data.success) setStats(data.data);
      } catch {
        // Silently fail — stats are non-critical
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handlePwdChange = (e) => {
    setPwdForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (pwdForm.newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdSubmitting(true);
    try {
      const { data } = await api.put('/auth/password', {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      if (data.success) {
        setPwdSuccess('Password changed successfully.');
        setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPwdError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setPwdSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: '#8b5cf6' }} />
      </div>
    );
  }

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  const dashboardPath = user.role === 'professor' ? '/dashboard' : '/student/dashboard';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up text-slate-900 dark:text-white">
      {/* Profile Card */}
      <div
        className="w-full p-8 space-y-6 rounded-2xl"
        style={{
          background: 'var(--color-surface-card)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Back link */}
        <Link
          to={dashboardPath}
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors duration-200"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <ArrowLeftIcon />
          Back to Dashboard
        </Link>

        {/* Avatar & Role */}
        <div className="flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              color: '#fff',
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            {user.name}
          </h1>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mt-2 capitalize"
            style={{
              background: user.role === 'professor'
                ? 'rgba(139, 92, 246, 0.15)'
                : 'rgba(16, 185, 129, 0.15)',
              color: user.role === 'professor' ? '#8b5cf6' : '#10b981',
              border: `1px solid ${user.role === 'professor' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            }}
          >
            {user.role}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Email address
            </label>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user.email}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Account role
            </label>
            <p className="text-sm font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>
              {user.role}
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}>
            <div className="p-4 rounded-xl text-center animate-pulse" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
              <div className="h-7 w-12 bg-slate-600/30 rounded mx-auto" />
              <div className="h-3 w-20 bg-slate-600/20 rounded mx-auto mt-2" />
            </div>
            <div className="p-4 rounded-xl text-center animate-pulse" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <div className="h-7 w-12 bg-slate-600/30 rounded mx-auto" />
              <div className="h-3 w-20 bg-slate-600/20 rounded mx-auto mt-2" />
            </div>
          </div>
        ) : user.role === 'professor' ? (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}>
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
              <p className="text-2xl font-extrabold" style={{ color: '#8b5cf6' }}>{stats?.totalQuizzes ?? 0}</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Total Quizzes Created</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <p className="text-2xl font-extrabold" style={{ color: '#10b981' }}>{stats?.avgStudentScore ?? 0}%</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Class Average Accuracy</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}>
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
              <p className="text-2xl font-extrabold" style={{ color: '#8b5cf6' }}>{stats?.quizzesTaken ?? 0}</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Quizzes Completed</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <p className="text-2xl font-extrabold" style={{ color: '#10b981' }}>{stats?.highestScore ?? 0}%</p>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>Personal Highest Score</p>
            </div>
          </div>
        )}

        {/* Change Password */}
        <div className="pt-4 border-t space-y-4" style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}>
          <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            Change Password
          </h3>

          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div>
              <label htmlFor="currentPassword" className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Current password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  required
                  value={pwdForm.currentPassword}
                  onChange={handlePwdChange}
                  autoComplete="current-password"
                  className="block w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none transition-all duration-300"
                  style={inputStyle}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                New password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? "text" : "password"}
                  required
                  minLength={6}
                  value={pwdForm.newPassword}
                  onChange={handlePwdChange}
                  autoComplete="new-password"
                  className="block w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none transition-all duration-300"
                  style={inputStyle}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showNew ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-medium uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Confirm new password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={6}
                  value={pwdForm.confirmPassword}
                  onChange={handlePwdChange}
                  autoComplete="new-password"
                  className="block w-full px-4 py-3 pr-10 rounded-xl text-sm outline-none transition-all duration-300"
                  style={inputStyle}
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {pwdError && (
              <div
                role="alert"
                className="text-sm px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                }}
              >
                {pwdError}
              </div>
            )}

            {pwdSuccess && (
              <div
                role="status"
                className="text-sm px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#6ee7b7',
                }}
              >
                {pwdSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={pwdSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer hover:translate-y-[-1px] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
              }}
            >
              {pwdSubmitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Role-specific detailed content */}
        {!statsLoading && stats?.recentItems?.length > 0 && (
          <div className="pt-4 border-t space-y-3" style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              {user.role === 'professor' ? 'Recent Quizzes' : 'Recent Attempts'}
            </h3>

            {user.role === 'professor' ? (
              <div className="space-y-2">
                {stats.recentItems.map((q) => (
                  <div
                    key={q._id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{q.title}</span>
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{q.questionCount} Q</span>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        q.isApproved
                          ? 'bg-emerald-100 dark:bg-emerald-950/65 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {q.isApproved ? 'Published' : 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentItems.map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                    style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)' }}
                  >
                    <span className="font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{a.quizTitle}</span>
                    <span className="shrink-0 font-bold" style={{ color: a.scoreRatio >= 0.7 ? '#10b981' : a.scoreRatio >= 0.4 ? '#f59e0b' : '#ef4444' }}>
                      {Math.round(a.scoreRatio * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
