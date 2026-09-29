'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient, type Profile } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Page, PageTitle, Spinner, Empty, Pill, inputStyle } from '@/components/ui';
import { AdminNav } from '@/components/AdminNav';
import { useToast } from '@/components/Toast';

type Row = Profile & { enrollments: number };

export default function AdminStudentsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const [{ data: profiles, error }, { data: enr }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('enrollments').select('user_id'),
      ]);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const e of (enr ?? []) as { user_id: string }[]) {
        counts.set(e.user_id, (counts.get(e.user_id) ?? 0) + 1);
      }
      setRows(((profiles ?? []) as Profile[]).map((p) => ({ ...p, enrollments: counts.get(p.id) ?? 0 })));
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
      const supabase = createClient();
      const { error } = await supabase.from('profiles').update({ role }).eq('id', p.id);
      if (error) throw error;
      setRows((prev) => prev.map((x) => (x.id === p.id ? { ...x, role } : x)));
      toast(role === 'admin' ? `${p.name} ahora es Master Study` : `${p.name} ahora es alumno`, 'success');
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

      <input
        placeholder="🔍 Buscar por nombre o email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ ...inputStyle, marginBottom: 14 }}
      />

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty icon="👥" title="Sin usuarios" message="Los usuarios aparecerán cuando se registren." />
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
              <button onClick={() => toggleRole(p)} style={styles.roleBtn}>
                {p.role === 'admin' ? 'Hacer alumno' : 'Hacer Master'}
              </button>
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
  roleBtn: { flexShrink: 0, background: 'transparent', border: '1px solid #262932', color: '#94A3B8', borderRadius: 8, padding: '7px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
