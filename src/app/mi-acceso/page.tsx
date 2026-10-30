'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getAccess, type AccessState } from '@/lib/api';
import { PRODUCTS, type ProductMeta } from '@/lib/products';
import { Page, PageTitle, Spinner, Button } from '@/components/ui';
import { useToast } from '@/components/Toast';

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MiAccesoPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [access, setAccess] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        setAccess(await getAccess());
      } catch (e: any) {
        toast(e.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (loading) return <Spinner />;

  const user = access?.user;
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  function vigencia(p: ProductMeta): { text: string; color: string } {
    if (!p.premium) return { text: 'Incluido', color: 'var(--text-muted)' };
    const a = p.key !== 'aula' ? access?.products?.[p.key] : undefined;
    if (!a || !a.has_access) return { text: 'Bloqueado', color: 'var(--text-muted)' };
    if (a.lifetime) return { text: 'Vitalicio', color: '#4F86F7' };
    if (a.access_until) return { text: `Hasta ${fmtDate(a.access_until)}`, color: '#2FBF71' };
    return { text: 'Activo', color: '#2FBF71' };
  }

  return (
    <Page>
      <PageTitle title="Mi acceso" subtitle="Qué tienes activo y hasta cuándo." />

      <div style={styles.me}>
        <div style={styles.avatar}>{initial}</div>
        <div style={{ minWidth: 0 }}>
          <div style={styles.meName}>{user?.name || 'Alumno'}</div>
          <div style={styles.meSub}>{user?.email}{user?.role === 'admin' ? ' · Admin' : ' · Alumno'}</div>
        </div>
      </div>

      <p style={styles.sectionLbl}>Productos y vigencia</p>
      <div style={styles.list}>
        {PRODUCTS.map((p) => {
          const v = vigencia(p);
          return (
            <div key={p.name} style={styles.row}>
              <span style={{ ...styles.dot, backgroundColor: p.color }} />
              <span style={styles.name}>{p.name}</span>
              <span style={{ ...styles.exp, color: v.color }}>{v.text}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 16, maxWidth: 620 }}>
        <Link href="/canjear" style={{ textDecoration: 'none' }}>
          <Button variant="outline" full>Canjear otro cupón</Button>
        </Link>
      </div>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  me: { display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 18, maxWidth: 620, boxShadow: 'var(--shadow-card)' },
  avatar: { width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--surface-hi)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-bricolage), sans-serif', flex: '0 0 auto' },
  meName: { color: 'var(--text)', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-bricolage), sans-serif' },
  meSub: { color: 'var(--text-muted)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  sectionLbl: { color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, margin: '0 0 10px' },
  list: { display: 'flex', flexDirection: 'column', gap: 1, backgroundColor: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', maxWidth: 620, boxShadow: 'var(--shadow-card)' },
  row: { display: 'flex', alignItems: 'center', gap: 11, backgroundColor: 'var(--surface)', padding: '13px 14px' },
  dot: { width: 9, height: 9, borderRadius: 3, flex: '0 0 auto' },
  name: { flex: 1, color: '#CBD3DF', fontSize: 14, fontWeight: 600 },
  exp: { fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' },
};
