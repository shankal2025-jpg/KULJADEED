import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Create axios instance with credentials
const api = axios.create({
  baseURL: API,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const formatApiError = (detail) => {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).filter(Boolean).join(' ');
  if (detail?.msg) return detail.msg;
  return String(detail);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      setUser(data);
      return { success: true };
    } catch (e) {
      return { success: false, error: formatApiError(e.response?.data?.detail) };
    }
  };

  const register = async (email, password, name) => {
    try {
      const { data } = await api.post('/api/auth/register', { email, password, name });
      setUser(data);
      return { success: true };
    } catch (e) {
      return { success: false, error: formatApiError(e.response?.data?.detail) };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const refreshToken = async () => {
    try {
      await api.post('/api/auth/refresh');
      return true;
    } catch {
      setUser(null);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshToken, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
