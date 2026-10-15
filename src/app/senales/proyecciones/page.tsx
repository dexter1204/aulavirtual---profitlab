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
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 12px 90px' }}>
      <SignalsTabs />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 style={styles.h1}>Proyecciones</h1>
        <span style={styles.count}>{items.length}</span>
      </div>

      {denied ? (
        <div style={styles.denied}>Necesitas acceso a las señales. <Link href="/senales" style={{ color: '#C7F94C' }}>Activar</Link></div>
      ) : loading ? <Spinner /> : items.length === 0 ? (
        <div style={styles.empty}>Aún no hay proyecciones.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((p) => {
            const up = p.direction === 'alcista';
            const prob = PROB[p.probability];
            return (
              <Link key={p.id} href={`/senales/proyecciones/detalle/?id=${p.id}`} style={styles.card}>
                {p.image_url && <img src={materialHref(p.image_url)} alt="" style={styles.img} />}
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ ...styles.badge, color: up ? '#4ade80' : '#f87171', borderColor: up ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)' }}>{up ? '▲ ALCISTA' : '▼ BAJISTA'}</span>
                    <span style={{ ...styles.badge, color: prob.color, borderColor: `${prob.color}66` }}>Prob. {prob.label}</span>
                  </div>
                  <div style={{ color: '#F1F5F9', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                  {p.description && <div style={styles.desc}>{p.description}</div>}
                  <div style={{ color: '#64748B', fontSize: 12, marginTop: 8 }}>★ {p.trader?.name?.split(' ')[0] ?? 'Mentor'} · {new Date(p.created_at.replace(' ', 'T')).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}{p.tradingview_url ? ' · 📊 TV' : ''}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {isAdmin && <Link href="/senales/proyecciones/nueva" style={styles.fab} aria-label="Nueva proyección">+</Link>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h1: { color: '#F1F5F9', fontSize: 22, fontWeight: 800, margin: 0, fontFamily: 'var(--font-bricolage), sans-serif', letterSpacing: -0.4 },
  count: { background: '#14161C', border: '1px solid #1F222B', color: '#94A3B8', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999 },
  denied: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 14 },
  empty: { color: '#64748B', fontSize: 14, textAlign: 'center', padding: '40px 0' },
  card: { display: 'block', textDecoration: 'none', background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, overflow: 'hidden' },
  img: { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' },
  badge: { fontSize: 10.5, fontWeight: 700, border: '1px solid', borderRadius: 6, padding: '2px 8px' },
  desc: { color: '#94A3B8', fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  fab: { position: 'fixed', right: 18, bottom: 78, width: 56, height: 56, borderRadius: 999, background: '#C7F94C', color: '#0A0B0E', fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: '0 10px 30px rgba(199,249,76,.3)', zIndex: 60 },
};
