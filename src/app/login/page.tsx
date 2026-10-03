'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LogoMark } from '@/components/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
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
      router.replace('/cursos');
    } catch (err: any) {
      setError(traducirError(err?.message) ?? 'No pudimos iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <LogoMark size={34} />
          <div>
            <h1 style={styles.brand}>Profit Lab</h1>
            <p style={styles.brandSub}>Aula Virtual · Academy</p>
          </div>
        </div>

        <h2 style={styles.title}>
          Bienvenido
          <br />
          de vuelta.
        </h2>
        <p style={styles.subtitle}>Ingresa para continuar tus cursos.</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoCapitalize="none"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.cta}>
            {loading ? '...' : 'ENTRAR'}
          </button>
        </form>

        <button type="button" onClick={() => setShowForgot((v) => !v)} style={styles.forgotBtn}>
          ¿Olvidaste tu contraseña?
        </button>

        {showForgot && (
          <div style={styles.forgotBox}>
            <p style={styles.forgotText}>
              Escríbenos por WhatsApp y restablecemos tu contraseña. Luego podrás cambiarla
              tú mismo desde «Mi perfil».
            </p>
            <a
              href="https://wa.link/4hlin5"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.waBtn}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 00-8.5 15.2L2 22l4.9-1.4A10 10 0 1012 2zm0 18a8 8 0 01-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1112 20zm4.6-5.5c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 01-3.2-2.8c-.1-.2 0-.3.1-.5l.4-.5c.1-.1.2-.2.2-.4 0-.1 0-.3-.1-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2 1 2.4.1.2 1.6 2.4 3.9 3.4l1.3.5c.5.2 1 .1 1.4.1.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z" />
              </svg>
              Pedir ayuda por WhatsApp
            </a>
          </div>
        )}

        <Link href="/signup" style={styles.signupRow}>
          ¿No tienes cuenta? <span style={styles.signupLink}>Créala gratis</span>
        </Link>

        <p style={styles.footer}>Acceso seguro · Cifrado SSL</p>
      </div>
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
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 420, padding: 32 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 },
  brand: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    lineHeight: '16px',
    fontFamily: 'var(--font-bricolage), sans-serif',
  },
  brandSub: { color: '#94A3B8', fontSize: 11, margin: '3px 0 0' },
  title: {
    color: '#F1F5F9',
    fontSize: 32,
    fontWeight: 800,
    lineHeight: '38px',
    margin: '0 0 8px 0',
    fontFamily: 'var(--font-bricolage), sans-serif',
    letterSpacing: -0.6,
  },
  subtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 28 },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#14161C',
    border: '1px solid #262932',
    borderRadius: 10,
    padding: '14px',
    fontSize: 14,
    color: '#F1F5F9',
    marginBottom: 12,
  },
  error: { color: '#FCA5A5', fontSize: 12, marginBottom: 12, marginTop: 0 },
  cta: {
    width: '100%',
    backgroundColor: '#C7F94C',
    color: '#0A0B0E',
    border: 'none',
    borderRadius: 10,
    padding: 16,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 1.2,
    cursor: 'pointer',
    marginTop: 12,
  },
  signupRow: {
    display: 'block',
    textAlign: 'center',
    textDecoration: 'none',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 18,
    padding: 8,
  },
  forgotBtn: {
    display: 'block',
    width: '100%',
    marginTop: 14,
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center',
    textDecoration: 'underline',
    padding: 4,
  },
  forgotBox: {
    marginTop: 10,
    backgroundColor: '#14161C',
    border: '1px solid #262932',
    borderRadius: 12,
    padding: 14,
  },
  forgotText: { color: '#CBD5E1', fontSize: 12.5, lineHeight: '18px', margin: '0 0 12px' },
  waBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    color: '#0A0B0E',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 10,
    padding: '11px 14px',
    textDecoration: 'none',
  },
  signupLink: { color: '#C7F94C', fontWeight: 600 },
  footer: { textAlign: 'center', color: '#64748B', fontSize: 10, marginTop: 24 },
};
