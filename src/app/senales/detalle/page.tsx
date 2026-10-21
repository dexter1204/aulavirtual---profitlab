'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchSignal, moveToBE, markCheckpoint, closeSignal, deleteSignal, calculateRealR,
  type Signal, type SignalStatus,
} from '@/lib/signals';
import { materialHref } from '@/lib/api';
import { Spinner } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function DetalleSenalPage() {
  return <Suspense fallback={<Spinner />}><Detalle /></Suspense>;
}

const CLOSED: SignalStatus[] = ['tp4_hit', 'sl_hit', 'closed'];

function Detalle() {
  const router = useRouter();
  const search = useSearchParams();
  const id = Number(search.get('id'));
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [s, setS] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setS(await fetchSignal(id)); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (id) load(); else setLoading(false); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <Spinner />;
  if (!s) return <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Señal no encontrada.</div>;

  const entry = parseFloat(s.entry_price), sl = parseFloat(s.stop_loss), risk = Math.abs(entry - sl);
  const isLong = s.direction === 'long';
  const reached = (tps: SignalStatus[]) => tps.includes(s.status);
  const rTP1 = reached(['tp1_hit', 'tp2_hit', 'tp3_hit', 'tp4_hit']);
  const rTP2 = reached(['tp2_hit', 'tp3_hit', 'tp4_hit']);
  const rTP3 = reached(['tp3_hit', 'tp4_hit']);
  const rTP4 = s.status === 'tp4_hit';
  const closed = CLOSED.includes(s.status);
  const r = calculateRealR(s);

  const actionR = (price: number) => risk ? +(Math.abs(price - entry) / risk).toFixed(2) : 0;

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await fn(); toast(ok, 'success'); await load(); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const confirmDo = (msg: string, fn: () => Promise<void>, ok: string) => { if (confirm(msg)) run(fn, ok); };

  const rr = risk ? (Math.abs(parseFloat(s.take_profit_1) - entry) / risk).toFixed(2) : '—';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 12px 100px' }}>
      <Link href="/senales" style={styles.back}>← Señales</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
        <h1 style={styles.asset}>{s.asset}</h1>
        <span style={{ ...styles.dir, color: isLong ? '#4ade80' : '#f87171', borderColor: isLong ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)' }}>{isLong ? 'LONG ▲' : 'SHORT ▼'}</span>
      </div>

      <StatusBanner status={s.status} r={r} />

      <div style={styles.traderStrip}>
        <span style={styles.avatar}>{(s.trader?.name ?? 'M')[0]}</span>
        <div><div style={{ color: '#64748B', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>Firmada por</div>
          <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }}>★ {s.trader?.name ?? 'Mentor'}</div></div>
      </div>

      {s.image_url && (
        <img src={materialHref(s.image_url)} alt="Gráfico" style={styles.chartImg} />
      )}

      <div style={styles.card}>
        <Row label="Entry" value={fmt(entry)} />
        <Row label="Stop loss" value={fmt(sl)} color="#f87171" />
        <Row label="TP1" value={fmt(parseFloat(s.take_profit_1))} color="#4ade80" check={rTP1} />
        {s.take_profit_2 && <Row label="TP2" value={fmt(parseFloat(s.take_profit_2))} color="#4ade80" check={rTP2} />}
        {s.take_profit_3 && <Row label="TP3" value={fmt(parseFloat(s.take_profit_3))} color="#4ade80" check={rTP3} />}
        {s.take_profit_4 && <Row label="TP4" value={fmt(parseFloat(s.take_profit_4))} color="#4ade80" check={rTP4} />}
        <div style={styles.rr}><span>Risk : Reward</span><span style={{ color: '#C7F94C', fontWeight: 700 }}>1 : {rr}</span></div>
      </div>

      {isAdmin && !closed && (
        <div style={styles.actions}>
          <div style={styles.actionsTitle}>Acciones del mentor</div>
          <div style={styles.actionsGrid}>
            {s.status === 'active' && <ActBtn onClick={() => confirmDo('¿Mover SL a entry (BE)?', () => moveToBE(s.id), 'SL movido a BE')} disabled={busy}>Mover a BE</ActBtn>}
            {!rTP1 && <ActBtn onClick={() => confirmDo(`¿TP1 alcanzado? (+${actionR(parseFloat(s.take_profit_1))}R)`, () => markCheckpoint(s.id, 'tp1_hit', actionR(parseFloat(s.take_profit_1))), 'TP1 marcado')} disabled={busy}>TP1 alcanzado</ActBtn>}
            {!rTP2 && s.take_profit_2 && <ActBtn onClick={() => confirmDo(`¿TP2 alcanzado? (+${actionR(parseFloat(s.take_profit_2!))}R)`, () => markCheckpoint(s.id, 'tp2_hit', actionR(parseFloat(s.take_profit_2!))), 'TP2 marcado')} disabled={busy}>TP2 alcanzado</ActBtn>}
            {!rTP3 && s.take_profit_3 && <ActBtn onClick={() => confirmDo(`¿TP3 alcanzado? (+${actionR(parseFloat(s.take_profit_3!))}R)`, () => markCheckpoint(s.id, 'tp3_hit', actionR(parseFloat(s.take_profit_3!))), 'TP3 marcado')} disabled={busy}>TP3 alcanzado</ActBtn>}
            {s.take_profit_4 && <ActBtn green onClick={() => confirmDo(`¿TP4 alcanzado? Cierre final (+${actionR(parseFloat(s.take_profit_4!))}R)`, () => closeSignal(s.id, 'tp4_hit', actionR(parseFloat(s.take_profit_4!))), 'Cerrada en TP4')} disabled={busy}>TP4 · cerrar</ActBtn>}
            <ActBtn red onClick={() => confirmDo('¿SL alcanzado? Cierre (-1R)', () => closeSignal(s.id, 'sl_hit', -1), 'Cerrada en SL')} disabled={busy}>SL alcanzado</ActBtn>
            <ActBtn onClick={() => confirmDo('¿Cerrar manualmente? (0R)', () => closeSignal(s.id, 'closed_manual', 0), 'Cerrada')} disabled={busy}>Cerrar manual</ActBtn>
          </div>
          <Link href={`/senales/editar/?id=${s.id}`} style={styles.editLink}>✏️ Editar trade</Link>
        </div>
      )}

      {s.updates && s.updates.length > 0 && (
        <div style={styles.card}>
          <div style={styles.secLabel}>Actualizaciones</div>
          {s.updates.map((u) => (
            <div key={u.id} style={styles.upRow}>
              <span style={{ ...styles.upDot, background: dotColor(u.type) }} />
              <div><div style={{ color: '#CBD5E1', fontSize: 13 }}>{u.message || humanize(u.type)}</div>
                <div style={{ color: '#64748B', fontSize: 11 }}>{new Date(u.created_at.replace(' ', 'T')).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
            </div>
          ))}
        </div>
      )}

      {s.notes && <div style={styles.card}><div style={styles.secLabel}>Análisis / notas</div><div style={styles.pre}>{s.notes}</div></div>}
      {s.recommendations && <div style={{ ...styles.card, borderColor: 'rgba(199,249,76,.4)' }}><div style={{ ...styles.secLabel, color: '#C7F94C' }}>💡 Recomendaciones</div><div style={styles.pre}>{s.recommendations}</div></div>}
      {s.tradingview_url && <a href={materialHref(s.tradingview_url)} target="_blank" rel="noopener" style={styles.tvLink}>📊 Ver en TradingView ↗</a>}

      {isAdmin && (
        <div style={styles.danger}>
          <div style={{ color: '#f87171', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Zona peligrosa</div>
          <button disabled={busy} onClick={() => { if (confirm('¿Eliminar esta señal?') && confirm('Esto es permanente. ¿Confirmar?')) run(() => deleteSignal(s.id).then(() => router.push('/senales')), 'Señal eliminada'); }} style={styles.deleteBtn}>Eliminar señal</button>
        </div>
      )}
    </div>
  );
}

function StatusBanner({ status, r }: { status: SignalStatus; r: number | null }) {
  const map: Record<SignalStatus, { label: string; color: string }> = {
    active: { label: 'ACTIVA', color: '#4ade80' }, be: { label: 'EN BREAK-EVEN · R0', color: '#FCD34D' },
    tp1_hit: { label: 'TP1 ALCANZADO', color: '#4ade80' }, tp2_hit: { label: 'TP2 ALCANZADO', color: '#4ade80' },
    tp3_hit: { label: 'TP3 ALCANZADO', color: '#4ade80' }, tp4_hit: { label: 'TP4 · CERRADA', color: '#4ade80' },
    sl_hit: { label: 'STOP LOSS · CERRADA', color: '#f87171' }, closed: { label: 'CERRADA', color: '#94A3B8' },
  };
  const m = map[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#14161C', border: '1px solid #1F222B', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
      <span style={{ color: m.color, fontWeight: 700, fontSize: 13, letterSpacing: 0.4 }}>{m.label}</span>
      <span style={{ flex: 1 }} />
      {r != null && <span style={{ color: r > 0 ? '#C7F94C' : r < 0 ? '#f87171' : '#94A3B8', fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>{r > 0 ? '+' : ''}{r}R</span>}
    </div>
  );
}

function Row({ label, value, color = '#F1F5F9', check }: { label: string; value: string; color?: string; check?: boolean }) {
  return (
    <div style={styles.priceLine}>
      <span style={{ color: '#94A3B8', fontSize: 13 }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {check && <span style={{ color: '#4ade80' }}>✓</span>}
        <span style={{ color, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{value}</span>
      </span>
    </div>
  );
}
function ActBtn({ children, onClick, disabled, green, red }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; green?: boolean; red?: boolean }) {
  const c = green ? '#22c55e' : red ? '#ef4444' : '#1F222B';
  const fg = green || red ? '#0A0B0E' : '#CBD5E1';
  return <button onClick={onClick} disabled={disabled} style={{ background: green || red ? c : '#14161C', color: fg, border: `1px solid ${green || red ? c : '#1F222B'}`, borderRadius: 10, padding: '11px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: disabled ? 0.5 : 1, minHeight: 44 }}>{children}</button>;
}

function fmt(n: number): string { if (isNaN(n)) return '—'; return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: n < 100 ? 5 : 2 }); }
function humanize(t: string): string {
  const m: Record<string, string> = { published: 'Señal publicada', edited: 'Trade actualizado', be_moved: 'SL movido a BE', tp1_hit: 'TP1 alcanzado', tp2_hit: 'TP2 alcanzado', tp3_hit: 'TP3 alcanzado', tp4_hit: 'TP4 · cierre', sl_hit: 'Stop loss', closed_manual: 'Cierre manual', closed: 'Cerrada', note_added: 'Nota' };
  return m[t] ?? t;
}
function dotColor(t: string): string {
  if (t === 'sl_hit') return '#ef4444';
  if (t.includes('tp') || t === 'published') return '#4ade80';
  if (t === 'be_moved') return '#FCD34D';
  if (t === 'edited') return '#3B82F6';
  return '#94A3B8';
}

const styles: Record<string, React.CSSProperties> = {
  back: { color: '#94A3B8', fontSize: 13, textDecoration: 'none' },
  asset: { color: '#F1F5F9', fontSize: 24, fontWeight: 800, margin: 0, fontFamily: 'ui-monospace, monospace' },
  dir: { fontSize: 12, fontWeight: 700, border: '1px solid', borderRadius: 6, padding: '3px 9px' },
  traderStrip: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 34, height: 34, borderRadius: 999, background: 'rgba(199,249,76,.15)', color: '#C7F94C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 },
  chartImg: { width: '100%', borderRadius: 12, border: '1px solid #1F222B', marginBottom: 12, aspectRatio: '16/9', objectFit: 'cover' },
  card: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 16, marginBottom: 12 },
  priceLine: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1F222B' },
  rr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, color: '#94A3B8', fontSize: 13 },
  actions: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 16, marginBottom: 12 },
  actionsTitle: { color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  actionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  editLink: { display: 'block', textAlign: 'center', marginTop: 12, color: '#C7F94C', fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  secLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  upRow: { display: 'flex', gap: 10, padding: '8px 0' },
  upDot: { width: 8, height: 8, borderRadius: 999, marginTop: 5, flexShrink: 0 },
  pre: { color: '#CBD5E1', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  tvLink: { display: 'block', textAlign: 'center', color: '#C7F94C', fontSize: 14, textDecoration: 'none', padding: '12px 0', marginBottom: 12 },
  danger: { border: '1px solid rgba(239,68,68,.3)', borderRadius: 14, padding: 16 },
  deleteBtn: { width: '100%', background: 'transparent', color: '#f87171', border: '1px solid rgba(239,68,68,.4)', borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
