'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  apiLogin,
  apiSignup,
  apiMe,
  clearToken,
  getToken,
  type Profile,
} from '@/lib/api';

// Compatibilidad: mantenemos una forma de "sesión" mínima con user.id
type Session = { user: { id: string; email: string } } | null;

interface AuthContextValue {
  session: Session;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setLoading] = useState(true);

  const session: Session = profile ? { user: { id: profile.id, email: profile.email } } : null;

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    apiMe()
      .then((p) => setProfile(p))
      .catch(() => {
        clearToken();
        setProfile(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const p = await apiLogin(email.trim(), password);
    setProfile(p);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const p = await apiSignup(name, email.trim(), password);
    setProfile(p);
  };

  const logout = async () => {
    clearToken();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!getToken()) return;
    try {
      setProfile(await apiMe());
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        isLoading,
        isAdmin: profile?.role === 'admin',
        login,
        signUp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
