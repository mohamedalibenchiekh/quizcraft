import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // In a real app, this would be an API call. We are mocking it based on the role.
    const role = e.target.role.value;
    
    // Mock user and token
    const mockUser = { name: role === 'professor' ? 'Prof. Smith' : 'Student Bob', email: 'test@test.com', role };
    const mockToken = btoa(JSON.stringify(mockUser)); 
    
    login(mockToken, mockUser);
    
    if (role === 'professor') {
      navigate('/dashboard');
    } else {
      navigate('/session');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4">
      <div
        className="w-full max-w-md p-8 space-y-8 rounded-2xl"
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
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h2
            className="text-3xl font-extrabold tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
          >
            Welcome to <span style={{ color: '#8b5cf6' }}>QuizCraft</span>
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                style={{
                  background: 'var(--color-surface-input)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                }}
                placeholder="professor@university.edu"
                defaultValue="demo@quizcraft.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300"
                style={{
                  background: 'var(--color-surface-input)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                }}
                placeholder="••••••••"
                defaultValue="password"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
                Role
              </label>
              <select
                id="role"
                name="role"
                className="block w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-300 cursor-pointer"
                style={{
                  background: 'var(--color-surface-input)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                }}
              >
                <option value="professor">Professor</option>
                <option value="student">Student</option>
              </select>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer hover:translate-y-[-1px] hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.3)',
              }}
            >
              Sign In
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
