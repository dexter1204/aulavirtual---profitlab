'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LogoMark } from '@/components/Logo';
import { SUPERAPP, HOME_ROUTE } from '@/lib/basePath';

export default function LoginPage() {
  const { login, loginDemo } = useAuth();
  const router = useRouter();
  const isDev = process.env.NODE_ENV !== 'production';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Completa email y contraseña');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      router.replace(HOME_ROUTE);
    } catch (err: any) {
      setError(traducirError(err?.message) ?? 'No pudimos iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.main}>
      <div className="pl-rise" style={styles.card}>
        <div style={styles.sheen} aria-hidden="true" />

        <div style={styles.logoRow}>
          <span style={styles.logoBadge}>
            <LogoMark size={26} />
          </span>
          <div>
            <h1 style={styles.brand}>Profit Lab</h1>
            <p style={styles.brandSub}>{SUPERAPP ? 'Academy' : 'Aula Virtual · Academy'}</p>
          </div>
        </div>

        <h2 className="pl-display" style={styles.title}>
          Bienvenido
          <br />
          de vuelta.
        </h2>
        <p style={styles.subtitle}>
          {SUPERAPP ? 'Ingresa para acceder a tus productos.' : 'Ingresa para continuar tus cursos.'}
        </p>

        <form onSubmit={handleLogin}>
          <label style={styles.fieldLabel} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-input"
            style={styles.input}
            autoCapitalize="none"
            autoComplete="email"
          />

          <label style={styles.fieldLabel} htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-input"
            style={styles.input}
            autoComplete="current-password"
          />

          <div style={{ ...styles.errorWrap, maxHeight: error ? 60 : 0, opacity: error ? 1 : 0 }}>
            <p style={styles.error}>{error}</p>
          </div>

          <button type="submit" disabled={loading} className="pl-pressable" style={styles.cta}>
            {loading ? <span style={styles.ctaSpinner} aria-label="Cargando" /> : 'ENTRAR'}
          </button>
        </form>

        <button type="button" onClick={() => setShowForgot((v) => !v)} className="pl-pressable" style={styles.forgotBtn}>
          ¿Olvidaste tu contraseña?
        </button>

        <div style={{ ...styles.forgotBox, maxHeight: showForgot ? 220 : 0, opacity: showForgot ? 1 : 0, marginTop: showForgot ? 12 : 0 }}>
          <div style={styles.forgotInner}>
            <p style={styles.forgotText}>
              Escríbenos por WhatsApp y restablecemos tu contraseña. Luego podrás cambiarla
              tú mismo desde «Mi perfil».
            </p>
            <a
              href="https://wa.link/4hlin5"
              target="_blank"
              rel="noopener noreferrer"
              className="pl-pressable"
              style={styles.waBtn}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.6-5.5c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 01-3.2-2.8c-.1-.2 0-.3.1-.5l.4-.5c.1-.1.2-.2.2-.4 0-.1 0-.3-.1-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2 1 2.4.1.2 1.6 2.4 3.9 3.4l1.3.5c.5.2 1 .1 1.4.1.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z" />
              </svg>
              Pedir ayuda por WhatsApp
            </a>
          </div>
        </div>

        <Link href="/signup" className="pl-pressable" style={styles.signupRow}>
          ¿No tienes cuenta? <span style={styles.signupLink}>Créala gratis</span>
        </Link>

        {isDev && (
          <button
            type="button"
            onClick={() => { loginDemo(); router.replace(HOME_ROUTE); }}
            className="pl-pressable"
            style={styles.demoBtn}
          >
            ⚡ Entrar en modo demo (solo local)
          </button>
        )}

        <p style={styles.footer}>
          <span style={styles.lock} aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          Acceso seguro · Cifrado SSL
        </p>
      </div>

      <style jsx>{`
        .pl-input::placeholder { color: var(--text-dim); }
        .pl-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 4px rgba(199, 249, 76, 0.14);
        }
        @keyframes pl-cta-spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

function traducirError(msg?: string): string | null {
  if (!msg) return null;
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos';
  if (/email not confirmed/i.test(msg)) return 'Confirma tu email antes de entrar';
  return msg;
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100svh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'calc(24px + var(--safe-top)) 20px calc(24px + var(--safe-bottom))',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 400,
    boxSizing: 'border-box',
    padding: '32px 28px 26px',
    backgroundColor: 'rgba(20, 22, 28, 0.72)',
    border: '1px solid var(--border-hi)',
    borderRadius: 'var(--r-xl)',
    boxShadow: 'var(--shadow-pop)',
    backdropFilter: 'blur(28px) saturate(150%)',
    WebkitBackdropFilter: 'blur(28px) saturate(150%)',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 40%, rgba(199,249,76,0.35) 50%, rgba(255,255,255,0.18) 60%, transparent)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 'var(--r-md)',
    background: 'rgba(199, 249, 76, 0.10)',
    border: '1px solid rgba(199, 249, 76, 0.22)',
  },
  brand: {
    color: 'var(--text)',
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    lineHeight: '16px',
    fontFamily: 'var(--font-bricolage), sans-serif',
    letterSpacing: -0.2,
  },
  brandSub: { color: 'var(--text-muted)', fontSize: 11, margin: '4px 0 0', letterSpacing: 0.2 },
  title: {
    color: 'var(--text)',
    fontSize: 34,
    margin: '0 0 10px 0',
  },
  subtitle: { color: 'var(--text-muted)', fontSize: 14.5, marginBottom: 26, lineHeight: 1.45 },
  fieldLabel: {
    display: 'block',
    color: 'var(--text-muted)',
    fontSize: 12,
    fontWeight: 600,
    margin: '0 0 7px 2px',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(10, 11, 14, 0.6)',
    border: '1px solid var(--border-hi)',
    borderRadius: 'var(--r-md)',
    padding: '14px',
    fontSize: 15,
    color: 'var(--text)',
    marginBottom: 16,
    transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
  },
  errorWrap: {
    overflow: 'hidden',
    transition: 'max-height var(--dur-base) var(--ease-out), opacity var(--dur-base) var(--ease-out)',
  },
  error: { color: '#FCA5A5', fontSize: 12.5, margin: '0 0 12px' },
  cta: {
    width: '100%',
    height: 52,
    backgroundColor: 'var(--primary)',
    color: '#0A0B0E',
    border: 'none',
    borderRadius: 'var(--r-md)',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1.4,
    cursor: 'pointer',
    marginTop: 4,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 0 rgba(255,255,255,0.3) inset, var(--glow-primary)',
  },
  ctaSpinner: {
    width: 18,
    height: 18,
    border: '2.5px solid rgba(10,11,14,0.35)',
    borderTopColor: '#0A0B0E',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'pl-cta-spin 0.7s linear infinite',
  },
  signupRow: {
    display: 'block',
    textAlign: 'center',
    textDecoration: 'none',
    color: 'var(--text-muted)',
    fontSize: 13,
    marginTop: 20,
    padding: 10,
    borderRadius: 'var(--r-sm)',
  },
  forgotBtn: {
    display: 'block',
    width: '100%',
    marginTop: 16,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 12.5,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
    padding: 6,
    borderRadius: 'var(--r-sm)',
  },
  forgotBox: {
    overflow: 'hidden',
    transition: 'max-height var(--dur-sheet) var(--ease-drawer), opacity var(--dur-base) var(--ease-out), margin-top var(--dur-base) var(--ease-out)',
  },
  forgotInner: {
    backgroundColor: 'rgba(10, 11, 14, 0.5)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: 14,
  },
  forgotText: { color: '#CBD5E1', fontSize: 12.5, lineHeight: '19px', margin: '0 0 12px' },
  waBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    color: '#06231A',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 'var(--r-sm)',
    padding: '12px 14px',
    textDecoration: 'none',
  },
  signupLink: { color: 'var(--primary)', fontWeight: 600 },
  demoBtn: {
    display: 'block',
    width: '100%',
    marginTop: 12,
    background: 'rgba(199, 249, 76, 0.08)',
    border: '1px dashed rgba(199, 249, 76, 0.35)',
    color: 'var(--primary)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
    padding: '11px',
    borderRadius: 'var(--r-sm)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    color: 'var(--text-dim)',
    fontSize: 10.5,
    marginTop: 24,
    letterSpacing: 0.3,
  },
  lock: { display: 'inline-flex', color: 'var(--text-dim)' },
};
