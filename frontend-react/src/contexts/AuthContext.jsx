import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ems_token'));
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    const storedToken = localStorage.getItem('ems_token');
    const storedUser = localStorage.getItem('ems_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        const res = await api.get('/auth/session');
        if (res.data.authenticated) {
          setUser(res.data.user);
          localStorage.setItem('ems_user', JSON.stringify(res.data.user));
          return true;
        }
      } catch {
        localStorage.removeItem('ems_token');
        localStorage.removeItem('ems_user');
        setToken(null);
        setUser(null);
      }
    }
    try {
      const res = await api.get('/auth/session');
      if (res.data.authenticated) {
        setUser(res.data.user);
        localStorage.setItem('ems_user', JSON.stringify(res.data.user));
        return true;
      }
    } catch {
    }
    return false;
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await checkSession();
      setIsLoading(false);
    };
    init();
  }, [checkSession]);

  const login = async (email, password) => {
    const res = await api.post('/auth/email-login', { email, password });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('ems_token', res.data.token);
      localStorage.setItem('ems_user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.data.error || 'Login failed');
  };

  const register = async (display_name, email, password, role) => {
    const res = await api.post('/auth/register', { display_name, email, password, role });
    if (res.data.success) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem('ems_token', res.data.token);
      localStorage.setItem('ems_user', JSON.stringify(res.data.user));
      return res.data;
    }
    throw new Error(res.data.error || 'Registration failed');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
    }
    localStorage.removeItem('ems_token');
    localStorage.removeItem('ems_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
