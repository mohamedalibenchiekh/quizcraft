import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

/**
 * SECURITY NOTE: Role claims decoded here are for UI cosmetic purposes only
 * (show/hide buttons, display conditional content). The backend middleware
 * (authenticateToken + requireRole) is the SINGLE AUTHORITATIVE gate for all
 * protected operations. Never make authZ decisions client-side.
 */
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

function decodeToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }
    return { name: payload.name, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => decodeToken(localStorage.getItem('token')));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (!decoded) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = useCallback((newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
