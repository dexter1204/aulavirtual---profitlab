'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LogoMark } from '@/components/Logo';
import { IconMail } from '@/components/icons';

export default function SignupPage() {
  const { signUp, login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Completa todos los campos');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUp(email.trim(), password, name.trim());
      // Si el proyecto no exige confirmación por email, iniciamos sesión directo.
      try {
        await login(email.trim(), password);
        router.replace('/cursos');
        return;
      } catch {
        setDone(true);
      }
    } catch (err: any) {
      setError(traducir(err?.message) ?? 'No pudimos crear tu cuenta');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <div style={{ marginBottom: 16, color: '#C7F94C', display: 'flex', justifyContent: 'center' }}>
            <IconMail size={42} />
          </div>
          <h2 style={styles.title}>Revisa tu correo</h2>
          <p style={styles.subtitle}>
            Te enviamos un enlace de confirmación a <strong>{email}</strong>. Confírmalo y luego
            inicia sesión.
          </p>
          <Link href="/login" style={{ ...styles.cta, display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            IR A INICIAR SESIÓN
          </Link>
        </div>
      </main>
    );
  }

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

        <h2 style={styles.title}>Crea tu cuenta.</h2>
        <p style={styles.subtitle}>Accede a los cursos de la academia.</p>

        <form onSubmit={handleSignup}>
          <input
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
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
            placeholder="Contraseña (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.cta}>
            {loading ? '...' : 'CREAR CUENTA'}
          </button>
        </form>

        <Link href="/login" style={styles.signupRow}>
          ¿Ya tienes cuenta? <span style={styles.signupLink}>Inicia sesión</span>
        </Link>
      </div>
    </main>
  );
}

function traducir(msg?: string): string | null {
  if (!msg) return null;
  if (/already registered|already exists/i.test(msg)) return 'Ese email ya está registrado';
  if (/password/i.test(msg)) return 'Contraseña no válida (mín. 6 caracteres)';
  return msg;
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, padding: 32 },
  logoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 },
  brand: { color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: 0, lineHeight: '16px', fontFamily: 'var(--font-bricolage), sans-serif' },
  brandSub: { color: '#94A3B8', fontSize: 11, margin: '3px 0 0' },
  title: { color: '#F1F5F9', fontSize: 30, fontWeight: 800, lineHeight: '36px', margin: '0 0 8px 0', fontFamily: 'var(--font-bricolage), sans-serif', letterSpacing: -0.6 },
  subtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 28 },
  input: { width: '100%', boxSizing: 'border-box', backgroundColor: '#14161C', border: '1px solid #262932', borderRadius: 10, padding: '14px', fontSize: 14, color: '#F1F5F9', marginBottom: 12 },
  error: { color: '#FCA5A5', fontSize: 12, marginBottom: 12, marginTop: 0 },
  cta: { width: '100%', backgroundColor: '#C7F94C', color: '#0A0B0E', border: 'none', borderRadius: 10, padding: 16, fontSize: 14, fontWeight: 700, letterSpacing: 1.2, cursor: 'pointer', marginTop: 12 },
  signupRow: { display: 'block', textAlign: 'center', textDecoration: 'none', color: '#94A3B8', fontSize: 12, marginTop: 18, padding: 8 },
  signupLink: { color: '#C7F94C', fontWeight: 600 },
};
