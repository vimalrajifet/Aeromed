import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('aeromed_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('aeromed_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('aeromed_token');
      if (storedToken) {
        try {
          const res = await authApi.getCurrentUser();
          setUser(res.data.data);
          localStorage.setItem('aeromed_user', JSON.stringify(res.data.data));
        } catch (err) {
          console.warn('Stored token invalid or expired. Logging out.');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const res = await authApi.login({ username, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('aeromed_token', receivedToken);
    localStorage.setItem('aeromed_user', JSON.stringify(receivedUser));
    return receivedUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aeromed_token');
    localStorage.removeItem('aeromed_user');
  };

  const hasRole = (...allowedRoles) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return allowedRoles.includes(user.role);
  };

  const updateUserProfile = async (data) => {
    const res = await authApi.updateProfile(data);
    const updatedUser = res.data.data;
    setUser(updatedUser);
    localStorage.setItem('aeromed_user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
