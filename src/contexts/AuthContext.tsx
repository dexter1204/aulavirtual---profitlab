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
  /** Solo desarrollo: entra con un perfil falso para revisar el diseño sin backend. */
  loginDemo: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Solo desarrollo: perfil falso para revisar el diseño sin backend.
const DEMO_KEY = 'pl_demo';
const IS_DEV = process.env.NODE_ENV !== 'production';
function demoProfile(): Profile {
  const now = new Date().toISOString();
  return {
    id: 'demo-local',
    name: 'David Demo',
    email: 'demo@local',
    role: 'admin',
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setLoading] = useState(true);

  const session: Session = profile ? { user: { id: profile.id, email: profile.email } } : null;

  useEffect(() => {
    // Modo demo persistente (solo dev): sobrevive a recargas para revisar el diseño.
    if (IS_DEV && !getToken()) {
      try {
        if (window.localStorage.getItem(DEMO_KEY) === '1') {
          setProfile(demoProfile());
          setLoading(false);
          return;
        }
      } catch { /* ignore */ }
    }
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

  // Sesión expirada a mitad de uso: cualquier respuesta 401 de la API emite
  // 'pl:auth-expired'. Cerramos la sesión (sin recargar) → el guard de AppShell
  // redirige al login por SPA. Evita quedar atascado en "no autenticado".
  useEffect(() => {
    function onExpired() {
      clearToken();
      setProfile(null);
      setLoading(false);
    }
    window.addEventListener('pl:auth-expired', onExpired);
    return () => window.removeEventListener('pl:auth-expired', onExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const p = await apiLogin(email.trim(), password);
    setProfile(p);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const p = await apiSignup(name, email.trim(), password);
    setProfile(p);
  };

  // Solo desarrollo (next dev). En builds de producción NODE_ENV === 'production'
  // y esta rama queda eliminada como código muerto; además el botón que la llama
  // tampoco se renderiza. Sirve para recorrer el rediseño sin conectar al backend.
  const loginDemo = () => {
    if (!IS_DEV) return;
    try { window.localStorage.setItem(DEMO_KEY, '1'); } catch { /* ignore */ }
    setProfile(demoProfile());
    setLoading(false);
  };

  const logout = async () => {
    clearToken();
    try { window.localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
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
        loginDemo,
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
