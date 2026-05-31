import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { BrainCircuit } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav
      style={{
        background: 'var(--color-nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-nav-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                to="/"
                className="flex items-center gap-2.5 group transition-all duration-300 hover:opacity-95"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-[0_2px_10px_rgba(139,92,246,0.15)] group-hover:shadow-[0_4px_15px_rgba(139,92,246,0.3)]"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                  }}
                >
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <span
                  className="text-2xl font-extrabold tracking-tight"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
                >
                  Quiz<span style={{ color: '#8b5cf6' }}>Craft</span>
                </span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/profile"
                  className="text-sm font-medium transition-colors duration-200 hover:underline"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Hello, {user.name}
                </Link>
                <button 
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer hover:translate-y-[-1px]"
                  style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    color: 'var(--color-brand-300)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 hover:bg-white/5"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer hover:translate-y-[-1px] shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: '#fff',
                  }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
