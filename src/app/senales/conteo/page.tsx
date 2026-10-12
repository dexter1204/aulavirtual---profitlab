'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchStats, listTraders, type StatsResult, type StatsFilters, type TraderOption } from '@/lib/signals';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { SignalsTabs } from '@/components/SignalsTabs';

type Period = StatsFilters['period'];
const PERIODS: [Period, string][] = [['week', 'Semana'], ['month', 'Mes'], ['year', 'Año'], ['all', 'Todo']];

export default function ConteoPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('month');
  const [traderId, setTraderId] = useState<string>('');
  const [traders, setTraders] = useState<TraderOption[]>([]);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => { if (isAdmin) listTraders().then(setTraders).catch(() => {}); }, [isAdmin]);
  useEffect(() => {
    setLoading(true);
    fetchStats({ period, traderId: traderId || null })
      .then((s) => { setStats(s); setDenied(false); })
      .catch((e: any) => { if (String(e.message).includes('acceso')) setDenied(true); else toast(e.message, 'error'); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, traderId]);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px 12px 100px' }}>
      <SignalsTabs />
      <h1 style={styles.h1}>Conteo</h1>
      <p style={styles.sub}>Rendimiento de la academia · medido en RR.</p>

      <div style={styles.filters}>
        {PERIODS.map(([p, label]) => <button key={p} onClick={() => setPeriod(p)} style={{ ...styles.pill, backgroundColor: period === p ? '#C7F94C' : '#14161C', color: period === p ? '#0A0B0E' : '#94A3B8', borderColor: period === p ? '#C7F94C' : '#1F222B' }}>{label}</button>)}
      </div>
      {traders.length > 0 && (
        <select value={traderId} onChange={(e) => setTraderId(e.target.value)} style={{ ...styles.select }}>
          <option value="">Todos los traders</option>
          {traders.map((t) => <option key={t.id} value={t.id}>★ {t.name}</option>)}
        </select>
      )}

      {denied ? (
        <div style={styles.denied}>Necesitas acceso a las señales para ver el conteo. <Link href="/senales" style={{ color: '#C7F94C' }}>Activar acceso</Link></div>
      ) : loading || !stats ? <Spinner /> : (
        <>
          <div style={styles.statGrid}>
            <Stat label="RR Total" value={`${stats.rTotal >= 0 ? '+' : ''}${stats.rTotal} RR`} color={stats.rTotal >= 0 ? '#C7F94C' : '#f87171'} big />
            <Stat label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? '#4ade80' : '#f87171'} big />
            <Stat label="Cerrados" value={String(stats.closedCount)} />
            <Stat label="Activos" value={String(stats.activeCount)} color="#FCD34D" />
          </div>

          <div style={styles.card}>
            <div style={styles.secLabel}>Detalle gestión</div>
            <Row label="Parciales tomados" value={String(stats.partialsCount)} />
            <Row label="RR medio / parcial" value={`${stats.rAvgPerPartial}`} />
          </div>

          <div style={styles.card}>
            <div style={styles.secLabel}>Desglose por estado</div>
            {([['tp4_hit', 'TP4', '#22c55e'], ['tp3_hit', 'TP3', '#4ade80'], ['tp2_hit', 'TP2', '#4ade80'], ['tp1_hit', 'TP1', '#86efac'], ['be', 'BE', '#FCD34D'], ['sl_hit', 'SL', '#ef4444'], ['closed', 'Cerr.', '#94A3B8'], ['active', 'Activa', '#3B82F6']] as [keyof StatsResult['breakdown'], string, string][]).map(([k, label, color]) => {
              const n = stats.breakdown[k];
              const max = Math.max(stats.breakdown.tp4_hit, stats.breakdown.sl_hit, stats.breakdown.tp1_hit, 1);
              return (
                <div key={k} style={styles.barRow}>
                  <span style={{ width: 54, color: '#94A3B8', fontSize: 12 }}>{label}</span>
                  <span style={styles.track}><span style={{ display: 'block', height: '100%', width: `${Math.min(100, (n / max) * 100)}%`, background: color, borderRadius: 4 }} /></span>
                  <span style={{ width: 28, textAlign: 'right', color: '#F1F5F9', fontSize: 12, fontWeight: 700 }}>{n}</span>
                </div>
              );
            })}
          </div>

          <div style={styles.card}>
            <div style={styles.secLabel}>Evolución RR acumulado (por trade)</div>
            <EvolutionChart data={stats.evolution} />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', fontSize: 11, marginTop: 8 }}>
              <span>📍 {stats.closedCount} trades cerrados</span>
              <span>Acumulado: {stats.rTotal >= 0 ? '+' : ''}{stats.rTotal}RR</span>
            </div>
          </div>

          <Link href="/senales/sesiones" style={styles.sessionLink}>📋 Sesiones operativas →</Link>
        </>
      )}
    </div>
  );
}

function EvolutionChart({ data }: { data: StatsResult['evolution'] }) {
  if (!data.length) return <div style={{ color: '#64748B', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>Sin trades cerrados en este periodo.</div>;
  const W = 600, H = 220, pad = 10;
  const rs = data.map((d) => d.r);
  const max = Math.max(...rs, 0), min = Math.min(...rs, 0);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (W - pad * 2);
  const y = (r: number) => pad + (1 - (r - min) / span) * (H - pad * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.r)}`).join(' ');
  const zeroY = y(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#1F222B" strokeWidth={1} strokeDasharray="4 4" />
      <polyline points={pts} fill="none" stroke="#C7F94C" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(199,249,76,.5))' }} />
      {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.r)} r={3.5} fill={d.tradeR > 0 ? '#C7F94C' : d.tradeR < 0 ? '#f87171' : '#94A3B8'} />)}
    </svg>
  );
}

function Stat({ label, value, color = '#F1F5F9', big }: { label: string; value: string; color?: string; big?: boolean }) {
  return <div style={styles.stat}><div style={styles.statLbl}>{label}</div><div style={{ color, fontSize: big ? 26 : 20, fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>{value}</div></div>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1F222B' }}><span style={{ color: '#94A3B8', fontSize: 13 }}>{label}</span><span style={{ color: '#F1F5F9', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{value}</span></div>;
}

const styles: Record<string, React.CSSProperties> = {
  h1: { color: '#F1F5F9', fontSize: 22, fontWeight: 800, margin: 0, fontFamily: 'var(--font-bricolage), sans-serif', letterSpacing: -0.4 },
  sub: { color: '#94A3B8', fontSize: 13, margin: '4px 0 14px' },
  filters: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  pill: { border: '1px solid', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 38 },
  select: { width: '100%', background: '#14161C', color: '#F1F5F9', border: '1px solid #1F222B', borderRadius: 10, padding: '11px 13px', fontFamily: 'inherit', fontSize: 14, marginBottom: 16 },
  denied: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 14 },
  statGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  stat: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 16 },
  statLbl: { color: '#64748B', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  card: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 16, marginBottom: 12 },
  secLabel: { color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  barRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' },
  track: { flex: 1, height: 12, background: 'rgba(148,163,184,.1)', borderRadius: 4, overflow: 'hidden' },
  sessionLink: { display: 'block', textAlign: 'center', background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 14, color: '#C7F94C', fontSize: 14, fontWeight: 600, textDecoration: 'none' },
};
