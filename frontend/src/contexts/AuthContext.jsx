import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { EventType } from '@azure/msal-browser';
import { msalInstance } from '../msalConfig';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const ssoHandled = useRef(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
    setLoading(false);
  }, []);

  // Handle MSAL redirect SSO result via event callback
  useEffect(() => {
    const callbackId = msalInstance.addEventCallback(async (event) => {
      if (
        event.eventType === EventType.LOGIN_SUCCESS &&
        event.payload?.idToken &&
        !ssoHandled.current
      ) {
        ssoHandled.current = true;
        try {
          const res = await api.post('/api/auth/sso', { id_token: event.payload.idToken });
          localStorage.setItem('access_token', res.data.access_token);
          localStorage.setItem('refresh_token', res.data.refresh_token);
          setUser(res.data.user);
          setLoading(false);
        } catch (err) {
          console.error('SSO backend login failed:', err);
          setLoading(false);
        }
      }
    });
    return () => {
      if (callbackId) msalInstance.removeEventCallback(callbackId);
    };
  }, []);

  // Check existing tokens on mount
  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const ssoLogin = async (idToken) => {
    const res = await api.post('/api/auth/sso', { id_token: idToken });
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (email, password, full_name) => {
    const res = await api.post('/api/auth/register', { email, password, full_name });
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, ssoLogin, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
