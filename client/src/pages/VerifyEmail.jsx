import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const { data } = await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(data.message);
      } catch (err) {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
      }
    };
    verify();
  }, [token]);

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
        {status === 'verifying' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2" style={{ borderColor: '#8b5cf6' }} />
            </div>
            <h2
              className="text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
            >
              Verifying your email…
            </h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2
              className="text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
            >
              Email Verified!
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {message}
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
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2
              className="text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
            >
              Verification Failed
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {message}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 py-3 px-6 text-sm font-semibold rounded-xl transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
              }}
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
