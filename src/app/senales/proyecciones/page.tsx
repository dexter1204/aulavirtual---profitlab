'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjections, type Projection } from '@/lib/signals';
import { materialHref } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { SignalsTabs } from '@/components/SignalsTabs';

const PROB: Record<string, { label: string; color: string }> = {
  alta: { label: 'Alta', color: '#4ade80' }, media: { label: 'Media', color: '#FCD34D' }, baja: { label: 'Baja', color: '#f87171' },
};

export default function ProyeccionesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Projection[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const load = (silent = false) => {
    fetchProjections().then((p) => { setItems(p); setDenied(false); })
      .catch((e: any) => { if (String(e.message).includes('acceso')) setDenied(true); else if (!silent) toast(e.message, 'error'); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); const t = setInterval(() => load(true), 20000); return () => clearInterval(t); /* eslint-disable-next-line */ }, []);

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 12px 90px' }}>
      <SignalsTabs />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 className="pl-title" style={{ color: 'var(--text)', fontSize: 22, margin: 0 }}>Proyecciones</h1>
        <span style={styles.count}>{items.length}</span>
      </div>

      {denied ? (
        <div style={styles.denied}>Necesitas acceso a las señales. <Link href="/senales" style={{ color: 'var(--primary)' }}>Activar</Link></div>
      ) : loading ? <Spinner /> : items.length === 0 ? (
        <div style={styles.empty}>Aún no hay proyecciones.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {items.map((p) => {
            const up = p.direction === 'alcista';
            const prob = PROB[p.probability];
            return (
              <Link key={p.id} href={`/senales/proyecciones/detalle/?id=${p.id}`} className="pl-pressable pl-lift" style={styles.card}>
                {p.image_url && <img src={materialHref(p.image_url)} alt="" style={styles.img} />}
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ ...styles.badge, color: up ? 'var(--long)' : 'var(--short)', borderColor: up ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)' }}>{up ? '▲ ALCISTA' : '▼ BAJISTA'}</span>
                    <span style={{ ...styles.badge, color: prob.color, borderColor: `${prob.color}66` }}>Prob. {prob.label}</span>
                  </div>
                  <div style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700, letterSpacing: -0.01, marginBottom: 4 }}>{p.title}</div>
                  {p.description && <div style={styles.desc}>{p.description}</div>}
                  <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>★ {p.trader?.name?.split(' ')[0] ?? 'Mentor'} · {new Date(p.created_at.replace(' ', 'T')).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}{p.tradingview_url ? ' · 📊 TV' : ''}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {isAdmin && <Link href="/senales/proyecciones/nueva" className="pl-pressable" style={styles.fab} aria-label="Nueva proyección">+</Link>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  count: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-pill)', fontVariantNumeric: 'tabular-nums' },
  denied: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, boxShadow: 'var(--shadow-card)' },
  empty: { color: 'var(--text-dim)', fontSize: 14, textAlign: 'center', padding: '40px 0' },
  card: { display: 'block', textDecoration: 'none', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' },
  img: { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' },
  badge: { fontSize: 10.5, fontWeight: 700, border: '1px solid', borderRadius: 'var(--r-sm)', padding: '2px 8px' },
  desc: { color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  fab: { position: 'fixed', right: 18, bottom: 78, width: 56, height: 56, borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: 'var(--bg)', fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: 'var(--glow-primary), 0 8px 24px rgba(0,0,0,0.4)', zIndex: 60 },
};
