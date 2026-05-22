import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        background: 'rgba(15, 10, 30, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.1)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                to="/"
                className="text-2xl font-extrabold tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}
              >
                Quiz<span style={{ color: '#8b5cf6' }}>Craft</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Hello, {user.name}
                </span>
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
              <div className="flex space-x-4">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Login
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
