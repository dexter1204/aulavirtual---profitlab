'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { updateMyProfile, changePassword, listMyPurchases, type Purchase } from '@/lib/api';
import { listMyEnrollments } from '@/lib/enrollments';
import { Page, PageTitle, Card, Button, Field, inputStyle, Spinner, Pill } from '@/components/ui';
import { IconLock, IconCard, IconSettings } from '@/components/icons';
import { useToast } from '@/components/Toast';

function money(amount: number, currency: string): string {
  if (!amount || amount <= 0) return 'Gratis';
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function ProfilePage() {
  const { session, profile, isAdmin, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  // Cambio de contraseña
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changing, setChanging] = useState(false);

  // Compras
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);

  useEffect(() => {
    if (profile) setName(profile.name);
  }, [profile]);

  useEffect(() => {
    if (!session) return;
    listMyEnrollments(session.user.id).then((e) => setCount(e.length)).catch(() => setCount(0));
    listMyPurchases().then(setPurchases).catch(() => setPurchases([]));
  }, [session]);

  const save = async () => {
    if (!session || !name.trim()) return;
    setSaving(true);
    try {
      await updateMyProfile(name.trim());
      await refreshProfile();
      toast('Perfil actualizado', 'success');
    } catch (e: any) {
      toast(e?.message ?? 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const doChangePassword = async () => {
    if (!curPass || !newPass) return toast('Completa las contraseñas', 'error');
    if (newPass.length < 6) return toast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
    if (newPass !== confirmPass) return toast('Las contraseñas nuevas no coinciden', 'error');
    setChanging(true);
    try {
      await changePassword(curPass, newPass);
      setCurPass(''); setNewPass(''); setConfirmPass('');
      toast('Contraseña actualizada ✓', 'success');
    } catch (e: any) {
      toast(e?.message ?? 'No se pudo cambiar la contraseña', 'error');
    } finally {
      setChanging(false);
    }
  };

  if (!profile) return <Spinner />;

  const initials = profile.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  const totalSpent = (purchases ?? []).reduce((n, p) => n + (p.status === 'completed' ? p.amount : 0), 0);

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

      {/* DATOS */}
      <Card style={{ marginTop: 16 }}>
        <h3 style={styles.cardTitle}>Datos</h3>
        <Field label="Nombre">
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </Field>
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? '...' : 'Guardar cambios'}
        </Button>
      </Card>

      {/* CAMBIAR CONTRASEÑA */}
      <Card style={{ marginTop: 16 }}>
        <h3 style={styles.cardTitle}><IconLock size={16} color="#C7F94C" />Cambiar contraseña</h3>
        <Field label="Contraseña actual">
          <input type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} style={inputStyle} autoComplete="current-password" />
        </Field>
        <Field label="Nueva contraseña" hint="Mínimo 6 caracteres">
          <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} style={inputStyle} autoComplete="new-password" />
        </Field>
        <Field label="Repetir nueva contraseña">
          <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} style={inputStyle} autoComplete="new-password" />
        </Field>
        <Button onClick={doChangePassword} disabled={changing || !curPass || !newPass}>
          {changing ? '...' : 'Actualizar contraseña'}
        </Button>
      </Card>

      {/* MIS COMPRAS */}
      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={styles.cardTitle}><IconCard size={16} color="#C7F94C" />Mis compras</h3>
          {totalSpent > 0 && (
            <span style={{ color: '#94A3B8', fontSize: 12 }}>
              Total: <strong style={{ color: '#C7F94C' }}>{money(totalSpent, purchases?.[0]?.currency ?? 'USD')}</strong>
            </span>
          )}
        </div>

        {purchases === null ? (
          <div style={{ padding: 8 }}><Spinner size={22} /></div>
        ) : purchases.length === 0 ? (
          <p style={{ color: '#64748B', fontSize: 13, margin: '8px 0 0' }}>
            Todavía no tienes compras ni inscripciones registradas.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            {purchases.map((p) => (
              <div key={p.id} style={styles.purchaseRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }} className="clamp-2">{p.course_title}</div>
                  <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                    {new Date(p.created_at.replace(' ', 'T')).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.status === 'refunded' && ' · reembolsado'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: p.amount > 0 ? '#F1F5F9' : '#86EFAC', fontSize: 13, fontWeight: 700 }}>
                    {money(p.amount, p.currency)}
                  </div>
                  <Pill color={p.status === 'completed' ? '#22C55E' : '#F59E0B'}>
                    {p.status === 'completed' ? 'Completada' : 'Reembolso'}
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isAdmin && (
        <Link href="/admin" style={styles.adminLink}>
          <IconSettings size={16} />
          Ir al Panel Master Study →
        </Link>
      )}

      <button onClick={() => logout().then(() => router.replace('/login'))} style={styles.logout}>
        Cerrar sesión
      </button>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  avatar: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: '#C7F94C', color: '#0A0B0E',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, flexShrink: 0,
  },
  cardTitle: {
    display: 'flex', alignItems: 'center', gap: 8,
    color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: '0 0 12px',
    fontFamily: 'var(--font-bricolage), sans-serif',
  },
  purchaseRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    backgroundColor: '#0A0B0E', border: '1px solid #1F222B', borderRadius: 10, padding: '10px 12px',
  },
  adminLink: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, backgroundColor: 'rgba(199,249,76,0.1)', border: '1px solid rgba(199,249,76,0.3)',
    color: '#C7F94C', borderRadius: 12, padding: 16, textDecoration: 'none', fontWeight: 600, fontSize: 14,
  },
  logout: {
    display: 'block', width: '100%', marginTop: 24, background: 'transparent',
    border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5', borderRadius: 12, padding: 14,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  },
};
