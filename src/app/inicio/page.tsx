'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getAccess, type AccessState } from '@/lib/api';
import { PRODUCTS, type ProductMeta } from '@/lib/products';
import { Spinner } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  IconGraduation,
  IconChart,
  IconDocument,
  IconLayers,
  IconLock,
  IconArrowRight,
  IconTag,
} from '@/components/icons';

function ProductIcon({ keyName, color }: { keyName: ProductMeta['key']; color: string }) {
  const p = { size: 20, color };
  if (keyName === 'aula') return <IconGraduation {...p} />;
  if (keyName === 'signals') return <IconChart {...p} />;
  if (keyName === 'news') return <IconDocument {...p} />;
  return <IconLayers {...p} />; // quant
}

export default function InicioPage() {
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

  const firstName = (access?.user?.name || '').trim().split(' ')[0] || 'alumno';
  const hasAccess = (p: ProductMeta) =>
    !p.premium || (p.key !== 'aula' && !!access?.products?.[p.key]?.has_access);
  const anyLocked = PRODUCTS.some((p) => p.premium && !hasAccess(p));

  return (
    <div style={{ padding: '18px 16px 40px' }}>
      <div style={{ marginBottom: 22 }}>
        <p style={styles.hi}>Hola, {firstName}</p>
        <h1 className="pl-title" style={styles.h1}>Tu mesa de trabajo</h1>
      </div>

      <p className="pl-eyebrow" style={styles.sectionLbl}>Tus productos</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {PRODUCTS.map((p) => {
          const active = hasAccess(p);
          return (
            <Link
              key={p.name}
              href={p.href}
              className="pl-pressable pl-lift"
              style={styles.row}
              aria-label={`${p.name}${active ? '' : ' (bloqueado)'}`}
            >
              <span style={{ ...styles.tile, backgroundColor: `${p.color}22`, color: p.color }}>
                <ProductIcon keyName={p.key} color={p.color} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={styles.name}>{p.name}</span>
                <span style={styles.desc}>{p.desc}</span>
              </span>
              {active ? (
                <span style={styles.chipOn}>Activo</span>
              ) : (
                <span style={styles.lock}><IconLock size={15} color="#6B7688" /></span>
              )}
            </Link>
          );
        })}
      </div>

      {anyLocked && (
        <Link href="/canjear" className="pl-pressable pl-lift" style={styles.unlock}>
          <span style={styles.unlockIc}><IconTag size={18} color="#C7F94C" /></span>
          <span style={{ flex: 1 }}>
            <b style={styles.unlockTitle}>Desbloquea los productos premium</b>
            <span style={styles.unlockSub}>Canjea tu cupón general</span>
          </span>
          <IconArrowRight size={18} color="#C7F94C" />
        </Link>
      )}

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <Link href="/mi-acceso" className="pl-pressable" style={styles.link}>Ver mi acceso y vigencia</Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hi: { color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, margin: 0 },
  h1: { color: 'var(--text)', fontSize: 26, margin: '5px 0 0' },
  sectionLbl: { margin: '0 0 12px' },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: '12px 14px',
    textDecoration: 'none',
    boxShadow: 'var(--shadow-card)',
  },
  tile: { width: 38, height: 38, borderRadius: 'var(--r-sm)', display: 'grid', placeItems: 'center', flex: '0 0 auto' },
  name: { display: 'block', color: 'var(--text)', fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-bricolage), sans-serif', letterSpacing: -0.2 },
  desc: { display: 'block', color: 'var(--text-muted)', fontSize: 11.5, marginTop: 2 },
  chipOn: { fontSize: 10, fontWeight: 700, color: 'var(--long)', backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 'var(--r-pill)', padding: '4px 9px', whiteSpace: 'nowrap' },
  lock: { width: 30, height: 30, borderRadius: 'var(--r-sm)', backgroundColor: 'var(--surface-hi)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', flex: '0 0 auto' },
  unlock: { display: 'flex', alignItems: 'center', gap: 13, marginTop: 16, border: '1px dashed rgba(199,249,76,0.45)', backgroundColor: 'rgba(199,249,76,0.05)', borderRadius: 'var(--r-lg)', padding: '13px 14px', textDecoration: 'none' },
  unlockIc: { width: 34, height: 34, borderRadius: 'var(--r-sm)', backgroundColor: 'rgba(199,249,76,0.12)', display: 'grid', placeItems: 'center', flex: '0 0 auto' },
  unlockTitle: { display: 'block', color: 'var(--text)', fontSize: 13.5, fontWeight: 700 },
  unlockSub: { display: 'block', color: 'var(--text-muted)', fontSize: 11.5 },
  link: { display: 'inline-block', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid var(--border-hi)', paddingBottom: 2 },
};
