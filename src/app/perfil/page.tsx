'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import { listMyEnrollments } from '@/lib/enrollments';
import { Page, PageTitle, Card, Button, Field, inputStyle, Spinner, Pill } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function ProfilePage() {
  const { session, profile, isAdmin, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (profile) setName(profile.name);
  }, [profile]);

  useEffect(() => {
    if (session) listMyEnrollments(session.user.id).then((e) => setCount(e.length)).catch(() => setCount(0));
  }, [session]);

  const save = async () => {
    if (!session || !name.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
      toast('Perfil actualizado', 'success');
    } catch (e: any) {
      toast(e?.message ?? 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <Spinner />;

  const initials = profile.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Page>
      <PageTitle title="Mi perfil" />

      <Card style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={styles.avatar}>{initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#F1F5F9', fontSize: 16, fontWeight: 700 }}>{profile.name}</div>
          <div style={{ color: '#94A3B8', fontSize: 12 }}>{profile.email}</div>
          <div style={{ marginTop: 6 }}>
            <Pill color={isAdmin ? '#C7F94C' : '#94A3B8'}>{isAdmin ? 'Master Study' : 'Alumno'}</Pill>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#C7F94C', fontSize: 22, fontWeight: 800 }}>{count ?? '—'}</div>
          <div style={{ color: '#64748B', fontSize: 10 }}>cursos</div>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </Field>
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? '...' : 'Guardar cambios'}
        </Button>
      </Card>

      {isAdmin && (
        <Link href="/admin" style={styles.adminLink}>
          ⚙  Ir al Panel Master Study →
        </Link>
      )}

      <button
        onClick={() => logout().then(() => router.replace('/login'))}
        style={styles.logout}
      >
        Cerrar sesión
      </button>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#C7F94C',
    color: '#0A0B0E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 22,
    flexShrink: 0,
  },
  adminLink: {
    display: 'block',
    marginTop: 16,
    backgroundColor: 'rgba(199,249,76,0.1)',
    border: '1px solid rgba(199,249,76,0.3)',
    color: '#C7F94C',
    borderRadius: 12,
    padding: 16,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 14,
    textAlign: 'center',
  },
  logout: {
    display: 'block',
    width: '100%',
    marginTop: 24,
    background: 'transparent',
    border: '1px solid rgba(239,68,68,0.35)',
    color: '#FCA5A5',
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
