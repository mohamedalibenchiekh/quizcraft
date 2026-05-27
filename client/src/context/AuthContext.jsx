import React, { createContext, useState, useEffect, useContext } from 'react';

/**
 * SECURITY NOTE: Role claims decoded here are for UI cosmetic purposes only
 * (show/hide buttons, display conditional content). The backend middleware
 * (authenticateToken + requireRole) is the SINGLE AUTHORITATIVE gate for all
 * protected operations. Never make authZ decisions client-side.
 */
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ name: payload.name, email: payload.email, role: payload.role });
        localStorage.setItem('token', token);
      } catch (e) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
