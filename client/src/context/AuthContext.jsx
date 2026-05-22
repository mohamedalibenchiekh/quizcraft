import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    // In a real app, you would fetch user details using the token here
    if (token) {
      localStorage.setItem('token', token);
      // Mocking user decoding for now
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ name: payload.name, email: payload.email, role: payload.role });
      } catch (e) {
        // Handle invalid token
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
