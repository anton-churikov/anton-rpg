import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setToken } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for existing session
  useEffect(() => {
    const token = localStorage.getItem('anton_token');
    if (!token) { setLoading(false); return; }
    api.auth.me()
      .then(({ user, profile }) => { setUser(user); setProfile(profile); })
      .catch(() => { setToken(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user, profile } = await api.auth.login({ email, password });
    setToken(token);
    setUser(user);
    setProfile(profile);
    return { user, profile };
  }, []);

  const signup = useCallback(async (email, password, name) => {
    const { token, user, profile } = await api.auth.signup({ email, password, name });
    setToken(token);
    setUser(user);
    setProfile(profile);
    return { user, profile };
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const p = await api.player.get();
      setProfile(p);
      return p;
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading, login, signup, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
