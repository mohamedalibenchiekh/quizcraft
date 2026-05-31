import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
        <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}>
          <div
            className="p-4 rounded-xl text-center"
            style={{
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
            }}
          >
            <p className="text-2xl font-extrabold" style={{ color: '#8b5cf6' }}>—</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {user.role === 'professor' ? 'Total Quizzes' : 'Quizzes Taken'}
            </p>
          </div>
          <div
            className="p-4 rounded-xl text-center"
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
            }}
          >
            <p className="text-2xl font-extrabold" style={{ color: '#10b981' }}>—</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {user.role === 'professor' ? 'Avg Score' : 'Highest Score'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
