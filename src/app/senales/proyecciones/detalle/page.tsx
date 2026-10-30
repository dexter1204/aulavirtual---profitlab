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
  if (!p) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Proyección no encontrada.</div>;
  const up = p.direction === 'alcista'; const prob = PROB[p.probability];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 12px 100px' }}>
      <Link href="/senales/proyecciones" className="pl-pressable" style={styles.back}>← Proyecciones</Link>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <span style={{ ...styles.badge, color: up ? 'var(--long)' : 'var(--short)', borderColor: up ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)' }}>{up ? '▲ ALCISTA' : '▼ BAJISTA'}</span>
        <span style={{ ...styles.badge, color: prob.color, borderColor: `${prob.color}66` }}>Probabilidad {prob.label}</span>
      </div>
      <h1 className="pl-title" style={styles.title}>{p.title}</h1>
      <div style={{ color: 'var(--text-dim)', fontSize: 12.5, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>Publicada por ★ {p.trader?.name ?? 'Mentor'} · {new Date(p.created_at.replace(' ', 'T')).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      {p.image_url && <img src={materialHref(p.image_url)} alt="" style={styles.img} />}
      {p.description && <div style={styles.card}><div style={styles.secLabel}>Análisis</div><div style={styles.pre}>{p.description}</div></div>}
      {p.tradingview_url && <a href={materialHref(p.tradingview_url)} target="_blank" rel="noopener" className="pl-pressable" style={styles.tvLink}>📊 Ver en TradingView ↗</a>}

      {isAdmin && (
        <div style={styles.adminRow}>
          <Link href={`/senales/proyecciones/editar/?id=${p.id}`} className="pl-pressable" style={styles.editBtn}>✏️ Editar</Link>
          {p.status !== 'archived' && <button onClick={() => { if (confirm('¿Archivar proyección?')) archiveProjection(p.id).then(load).catch((e) => toast(e.message, 'error')); }} className="pl-pressable" style={styles.archiveBtn}>Archivar</button>}
          <button onClick={() => { if (confirm('¿Eliminar proyección?')) deleteProjection(p.id).then(() => router.push('/senales/proyecciones')).catch((e) => toast(e.message, 'error')); }} className="pl-pressable" style={styles.deleteBtn}>Eliminar</button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  back: { display: 'inline-block', color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' },
  badge: { fontSize: 11, fontWeight: 700, border: '1px solid', borderRadius: 'var(--r-sm)', padding: '3px 9px' },
  title: { color: 'var(--text)', fontSize: 22, margin: '0 0 6px', lineHeight: 1.2 },
  img: { width: '100%', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: 12 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 12, boxShadow: 'var(--shadow-card)' },
  secLabel: { color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  pre: { color: '#CBD5E1', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  tvLink: { display: 'block', textAlign: 'center', color: 'var(--primary)', fontSize: 14, fontWeight: 600, textDecoration: 'none', background: 'rgba(199,249,76,0.06)', border: '1px solid rgba(199,249,76,0.28)', borderRadius: 'var(--r-md)', padding: '13px 0', marginBottom: 12 },
  adminRow: { display: 'flex', gap: 8, marginTop: 8 },
  editBtn: { flex: 1, textAlign: 'center', background: 'var(--surface)', color: 'var(--primary)', border: '1px solid rgba(199,249,76,.4)', borderRadius: 'var(--r-sm)', padding: 12, fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  archiveBtn: { flex: 1, background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  deleteBtn: { flex: 1, background: 'transparent', color: 'var(--short)', border: '1px solid rgba(239,68,68,.4)', borderRadius: 'var(--r-sm)', padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
