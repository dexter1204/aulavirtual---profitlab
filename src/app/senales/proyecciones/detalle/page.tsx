'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjection, archiveProjection, deleteProjection, type Projection } from '@/lib/signals';
import { materialHref } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function DetalleProyeccionPage() {
  return <Suspense fallback={<Spinner />}><Detalle /></Suspense>;
}

const PROB: Record<string, { label: string; color: string }> = { alta: { label: 'Alta', color: '#4ade80' }, media: { label: 'Media', color: '#FCD34D' }, baja: { label: 'Baja', color: '#f87171' } };

function Detalle() {
  const router = useRouter();
  const id = Number(useSearchParams().get('id'));
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [p, setP] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => fetchProjection(id).then(setP).catch((e) => toast(e.message, 'error')).finally(() => setLoading(false));
  useEffect(() => { if (id) load(); else setLoading(false); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <Spinner />;
  if (!p) return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Proyección no encontrada.</div>;
  const up = p.direction === 'alcista'; const prob = PROB[p.probability];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 12px 100px' }}>
      <Link href="/senales/proyecciones" style={styles.back}>← Proyecciones</Link>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <span style={{ ...styles.badge, color: up ? '#4ade80' : '#f87171', borderColor: up ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)' }}>{up ? '▲ ALCISTA' : '▼ BAJISTA'}</span>
        <span style={{ ...styles.badge, color: prob.color, borderColor: `${prob.color}66` }}>Probabilidad {prob.label}</span>
      </div>
      <h1 style={styles.title}>{p.title}</h1>
      <div style={{ color: '#64748B', fontSize: 12.5, marginBottom: 12 }}>Publicada por ★ {p.trader?.name ?? 'Mentor'} · {new Date(p.created_at.replace(' ', 'T')).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      {p.image_url && <img src={materialHref(p.image_url)} alt="" style={styles.img} />}
      {p.description && <div style={styles.card}><div style={styles.secLabel}>Análisis</div><div style={styles.pre}>{p.description}</div></div>}
      {p.tradingview_url && <a href={materialHref(p.tradingview_url)} target="_blank" rel="noopener" style={styles.tvLink}>📊 Ver en TradingView ↗</a>}

      {isAdmin && (
        <div style={styles.adminRow}>
          <Link href={`/senales/proyecciones/editar/?id=${p.id}`} style={styles.editBtn}>✏️ Editar</Link>
          {p.status !== 'archived' && <button onClick={() => { if (confirm('¿Archivar proyección?')) archiveProjection(p.id).then(load).catch((e) => toast(e.message, 'error')); }} style={styles.archiveBtn}>Archivar</button>}
          <button onClick={() => { if (confirm('¿Eliminar proyección?')) deleteProjection(p.id).then(() => router.push('/senales/proyecciones')).catch((e) => toast(e.message, 'error')); }} style={styles.deleteBtn}>Eliminar</button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  back: { color: '#94A3B8', fontSize: 13, textDecoration: 'none' },
  badge: { fontSize: 11, fontWeight: 700, border: '1px solid', borderRadius: 6, padding: '3px 9px' },
  title: { color: '#F1F5F9', fontSize: 22, fontWeight: 800, margin: '0 0 6px', fontFamily: 'var(--font-bricolage), sans-serif', lineHeight: 1.2 },
  img: { width: '100%', borderRadius: 12, border: '1px solid #1F222B', marginBottom: 12 },
  card: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 16, marginBottom: 12 },
  secLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  pre: { color: '#CBD5E1', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  tvLink: { display: 'block', textAlign: 'center', color: '#C7F94C', fontSize: 14, textDecoration: 'none', padding: '12px 0', marginBottom: 12 },
  adminRow: { display: 'flex', gap: 8, marginTop: 8 },
  editBtn: { flex: 1, textAlign: 'center', background: '#14161C', color: '#C7F94C', border: '1px solid rgba(199,249,76,.4)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  archiveBtn: { flex: 1, background: '#14161C', color: '#94A3B8', border: '1px solid #1F222B', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { flex: 1, background: 'transparent', color: '#f87171', border: '1px solid rgba(239,68,68,.4)', borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
