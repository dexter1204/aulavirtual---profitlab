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
  signupLink: { color: '#C7F94C', fontWeight: 600 },
  footer: { textAlign: 'center', color: '#64748B', fontSize: 10, marginTop: 24 },
};
