'use client';

import { useEffect, useMemo, useState } from 'react';
import { listUsers, setUserRole, adminResetPassword, type UserRow } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Page, PageTitle, Spinner, Empty, Pill, inputStyle } from '@/components/ui';
import { AdminNav } from '@/components/AdminNav';
import { useToast } from '@/components/Toast';
import { IconSearch, IconX, IconUsers } from '@/components/icons';

type Row = UserRow;

export default function AdminStudentsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listUsers());
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const toggleRole = async (p: Row) => {
    const role = p.role === 'admin' ? 'student' : 'admin';
    if (p.id === session?.user.id && role === 'student') {
      if (!confirm('Vas a quitarte a ti mismo el rol de administrador. ¿Continuar?')) return;
    }
    try {
      await setUserRole(p.id, role);
      setRows((prev) => prev.map((x) => (x.id === p.id ? { ...x, role } : x)));
      toast(role === 'admin' ? `${p.name} ahora es Master Study` : `${p.name} ahora es alumno`, 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const resetPass = async (p: Row) => {
    // Clave temporal sugerida; el admin puede editarla antes de confirmar.
    const suggested = 'PL-' + Math.random().toString(36).slice(2, 8);
    const nueva = prompt(
      `Nueva contraseña temporal para ${p.name} (${p.email}).\n\nCompártesela y pídele que la cambie en «Mi perfil».`,
      suggested
    );
    if (nueva === null) return;
    if (nueva.trim().length < 6) {
      toast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    try {
      await adminResetPassword(p.id, nueva.trim());
      toast(`Contraseña de ${p.name} restablecida a: ${nueva.trim()}`, 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.email.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, query]
  );

  return (
    <Page>
      <PageTitle title="Alumnos" subtitle="Gestiona roles y accesos" />
      <AdminNav />

      <div className="searchField" style={{ marginBottom: 14 }}>
        <span className="searchIcon" aria-hidden="true">
          <IconSearch size={17} />
        </span>
        <input
          type="search"
          placeholder="Buscar por nombre o email…"
          aria-label="Buscar usuarios"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={inputStyle}
        />
        {query && (
          <button type="button" className="searchClear" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}>
            <IconX size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty icon={<IconUsers size={34} color="#64748B" />} title="Sin usuarios" message="Los usuarios aparecerán cuando se registren." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((p) => (
            <div key={p.id} style={styles.row}>
              <div style={styles.avatar}>
                {p.name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }} className="clamp-2">{p.name}</span>
                  {p.role === 'admin' && <Pill color="#C7F94C">Master</Pill>}
                </div>
                <div style={{ color: '#64748B', fontSize: 11 }}>{p.email}</div>
                <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{p.enrollments} inscripción(es)</div>
              </div>
              <div style={styles.actions}>
                <button onClick={() => toggleRole(p)} style={styles.roleBtn}>
                  {p.role === 'admin' ? 'Hacer alumno' : 'Hacer Master'}
                </button>
                <button onClick={() => resetPass(p)} style={styles.resetBtn}>
                  Restablecer clave
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 12, padding: '10px 12px' },
  avatar: { width: 36, height: 36, borderRadius: 9, backgroundColor: '#C7F94C', color: '#0A0B0E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  actions: { display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 },
  roleBtn: { background: 'transparent', border: '1px solid #262932', color: '#94A3B8', borderRadius: 8, padding: '7px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  resetBtn: { background: 'transparent', border: '1px solid rgba(199,249,76,0.35)', color: '#C7F94C', borderRadius: 8, padding: '7px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
};
