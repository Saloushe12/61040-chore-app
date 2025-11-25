import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      authService
        .getCurrentUser()
        .then((user) => setUser(user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { user, token } = await authService.login(email, password);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const register = async (email, password, displayName, role) => {
    const { user, token } = await authService.register(email, password, displayName, role);
    localStorage.setItem('token', token);
    setUser(user);
    return user;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateProfile = async (displayName, homeArea) => {
    const updatedUser = await authService.updateProfile(displayName, homeArea);
    setUser(updatedUser);
    return updatedUser;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
