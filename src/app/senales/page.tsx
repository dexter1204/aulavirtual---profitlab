'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getSignalsState, redeemSignalsCoupon, signalsCheckout,
  fetchSignals, calculateRealR,
  type SignalsAccess, type Signal, type SignalStatus,
} from '@/lib/signals';
import { verifyPayment } from '@/lib/api';
import { Page, PageTitle, Spinner, Button, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { IconChart, IconLock, IconCheck } from '@/components/icons';
import { SignalsTabs } from '@/components/SignalsTabs';

export default function SenalesPage() {
  return <Suspense fallback={<Spinner />}><Senales /></Suspense>;
}

function Senales() {
  const { session } = useAuth();
  const search = useSearchParams();
  const toast = useToast();
  const [state, setState] = useState<SignalsAccess | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setState(await getSignalsState()); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      const pago = search.get('pago');
      const paymentId = search.get('payment_id') || search.get('collection_id');
      if (pago === 'ok' && paymentId) {
        try { const { ok } = await verifyPayment(paymentId); toast(ok ? '¡Pago aprobado! Acceso activado.' : 'Pago recibido, se activará en breve.', ok ? 'success' : 'info'); } catch {}
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (loading) return <Spinner />;
  if (!state) return null;
  if (!state.has_access) return <Paywall state={state} onRedeemed={load} />;
  return <SignalsFeed />;
}

// ──────────────────────────────────────────────────────────────
// FEED
// ──────────────────────────────────────────────────────────────
type Filter = 'all' | 'active' | 'be' | 'closed';
const CLOSED: SignalStatus[] = ['tp1_hit', 'tp2_hit', 'tp3_hit', 'tp4_hit', 'sl_hit', 'closed'];

function SignalsFeed() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const first = useRef(true);

  const load = async (silent = false) => {
    try { setSignals(await fetchSignals()); }
    catch (e: any) { if (!silent) toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 15000); // tiempo real por polling
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { first.current = false; }, []);

  const counts = {
    all: signals.length,
    active: signals.filter((s) => s.status === 'active' || s.status === 'be').length,
    be: signals.filter((s) => s.status === 'be').length,
    closed: signals.filter((s) => CLOSED.includes(s.status)).length,
  };
  const shown = signals.filter((s) => {
    if (filter === 'all') return true;
    if (filter === 'active') return s.status === 'active' || s.status === 'be';
    if (filter === 'be') return s.status === 'be';
    return CLOSED.includes(s.status);
  });

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: '14px 12px 90px', maxWidth: 1200, margin: '0 auto' }}>
      <SignalsTabs />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <h1 className="pl-title" style={styles.h1}><IconChart size={20} color="var(--primary)" /> Señales</h1>
        <span style={styles.countPill}>{counts.all}</span>
      </div>
      <p style={styles.sub}>{isAdmin ? 'Tu feed · publica, edita y gestiona en vivo.' : 'Las señales que operamos, en tiempo real.'}</p>

      <div style={styles.filters}>
        {([['all', 'Todas'], ['active', 'Activas'], ['be', 'BE'], ['closed', 'Cerradas']] as [Filter, string][]).map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} className="pl-pressable"
            style={{ ...styles.fpill, backgroundColor: filter === f ? 'var(--primary)' : 'var(--surface)', color: filter === f ? '#0A0B0E' : 'var(--text-muted)', borderColor: filter === f ? 'var(--primary)' : 'var(--border)' }}>
            {label} <span style={{ opacity: 0.7 }}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div style={styles.empty}>No hay señales en esta vista.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
          {shown.map((s) => <SignalCard key={s.id} s={s} />)}
        </div>
      )}

      {isAdmin && (
        <Link href="/senales/nueva" className="pl-pressable" style={styles.fab} aria-label="Nueva señal">+</Link>
      )}
    </div>
  );
}

const STATUS_META: Record<SignalStatus, { label: string; color: string; bg: string }> = {
  active:  { label: 'ACTIVA',       color: '#4ade80', bg: 'rgba(34,197,94,.14)' },
  be:      { label: 'BE · R0',      color: '#FCD34D', bg: 'rgba(245,158,11,.14)' },
  tp1_hit: { label: 'TP1 ✓',        color: '#4ade80', bg: 'rgba(34,197,94,.14)' },
  tp2_hit: { label: 'TP2 ✓',        color: '#4ade80', bg: 'rgba(34,197,94,.14)' },
  tp3_hit: { label: 'TP3 ✓',        color: '#4ade80', bg: 'rgba(34,197,94,.14)' },
  tp4_hit: { label: 'TP4 ✓ CIERRE', color: '#4ade80', bg: 'rgba(34,197,94,.14)' },
  sl_hit:  { label: 'SL ✗',         color: '#f87171', bg: 'rgba(239,68,68,.14)' },
  closed:  { label: 'CERRADA',      color: '#94A3B8', bg: 'rgba(148,163,184,.12)' },
};

function fmtPrice(v: string | null): string {
  if (v == null) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: n < 100 ? 2 : 2, maximumFractionDigits: n < 100 ? 5 : 2 });
}
function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso.replace(' ', 'T')).getTime()) / 1000;
  if (d < 60) return 'ahora';
  if (d < 3600) return `hace ${Math.floor(d / 60)}m`;
  if (d < 86400) return `hace ${Math.floor(d / 3600)}h`;
  return `hace ${Math.floor(d / 86400)}d`;
}

function SignalCard({ s }: { s: Signal }) {
  const meta = STATUS_META[s.status];
  const r = calculateRealR(s);
  const isLong = s.direction === 'long';
  const border = s.status === 'active' ? 'rgba(34,197,94,.4)' : s.status === 'be' ? 'rgba(245,158,11,.4)' : 'var(--border)';
  return (
    <Link href={`/senales/detalle/?id=${s.id}`} className="pl-pressable pl-lift" style={{ ...styles.card, borderColor: border }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={styles.asset}>{s.asset}</span>
        <span style={{ ...styles.dir, color: isLong ? '#4ade80' : '#f87171', borderColor: isLong ? 'rgba(34,197,94,.4)' : 'rgba(239,68,68,.4)' }}>
          {isLong ? 'LONG ▲' : 'SHORT ▼'}
        </span>
        {s.audience === 'premium' && <span style={styles.premium}>PREMIUM</span>}
        <span style={{ flex: 1 }} />
        <span style={{ ...styles.statusTag, color: meta.color, background: meta.bg }}>{meta.label}</span>
      </div>
      <div style={styles.priceRow}>
        <PriceCell label="ENTRY" value={fmtPrice(s.entry_price)} />
        <PriceCell label="SL" value={fmtPrice(s.stop_loss)} color="#f87171" />
        <PriceCell label="TP1" value={fmtPrice(s.take_profit_1)} color="#4ade80" />
      </div>
      <div style={styles.cardFoot}>
        <span>★ {s.trader?.name?.split(' ')[0] ?? 'Mentor'} · {timeAgo(s.created_at)}</span>
        {r != null && <span style={{ color: r > 0 ? 'var(--primary)' : r < 0 ? '#f87171' : 'var(--text-muted)', fontWeight: 700 }}>{r > 0 ? '+' : ''}{r}R</span>}
      </div>
    </Link>
  );
}
function PriceCell({ label, value, color = 'var(--text)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={styles.priceCell}>
      <div style={styles.priceLbl}>{label}</div>
      <div style={{ ...styles.priceVal, color }}>{value}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// PAYWALL (igual que Mercados)
// ──────────────────────────────────────────────────────────────
function Paywall({ state, onRedeemed }: { state: SignalsAccess; onRedeemed: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [paying, setPaying] = useState(false);

  const redeem = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { toast('Ingresa tu cupón', 'error'); return; }
    setRedeeming(true);
    try { await redeemSignalsCoupon(c); toast('¡Acceso activado!', 'success'); onRedeemed(); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setRedeeming(false); }
  };
  const buy = async () => {
    setPaying(true);
    try { const { init_point } = await signalsCheckout(); window.location.href = init_point; }
    catch (e: any) { toast(e.message, 'error'); setPaying(false); }
  };

  const priceTxt = state.price > 0 ? `${state.currency === 'USD' ? '$' : state.currency + ' '}${state.price.toLocaleString('es')}` : null;
  const daysTxt = state.days > 0 ? `${state.days} días de acceso` : 'acceso vitalicio';

  return (
    <Page>
      <PageTitle title="Señales" subtitle="Señales de trading en vivo, gestión del trade (BE/parciales/cierre) y estadísticas de R." />
      <div style={styles.payCard}>
        <div style={styles.lockIcon}><IconLock size={26} color="var(--primary)" /></div>
        <h2 className="pl-title" style={styles.payTitle}>Activa tu acceso</h2>
        <p style={styles.payText}>Canjea tu cupón o adquiérelo para ver y seguir las señales.</p>
        <label style={styles.payLabel}>Tengo un cupón</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') redeem(); }}
            placeholder="CÓDIGO" style={{ ...inputStyle, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }} />
          <Button onClick={redeem} disabled={redeeming}>{redeeming ? '…' : 'Canjear'}</Button>
        </div>
        {priceTxt && (
          <>
            <div style={styles.divider}><span style={{ flex: 1, height: 1, background: 'var(--border)' }} />O<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>
            <Button variant="outline" full onClick={buy} disabled={paying}>
              <IconCheck size={15} /> {paying ? 'Abriendo el pago…' : `Comprar acceso — ${priceTxt} · ${daysTxt}`}
            </Button>
          </>
        )}
      </div>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h1: { color: 'var(--text)', fontSize: 22, margin: 0, display: 'flex', alignItems: 'center', gap: 8 },
  countPill: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-pill)' },
  sub: { color: 'var(--text-muted)', fontSize: 13, margin: '4px 0 14px' },
  filters: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  fpill: { border: '1px solid', borderRadius: 'var(--r-pill)', padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40, transition: 'background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)' },
  empty: { color: 'var(--text-dim)', fontSize: 14, textAlign: 'center', padding: '40px 0' },
  card: { display: 'block', textDecoration: 'none', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--shadow-card)' },
  asset: { color: 'var(--text)', fontSize: 16, fontWeight: 700, fontFamily: 'ui-monospace, monospace' },
  dir: { fontSize: 11, fontWeight: 700, border: '1px solid', borderRadius: 'var(--r-sm)', padding: '2px 7px' },
  premium: { fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(199,249,76,.12)', borderRadius: 'var(--r-sm)', padding: '2px 7px' },
  statusTag: { fontSize: 10, fontWeight: 700, borderRadius: 'var(--r-sm)', padding: '3px 8px', letterSpacing: 0.4 },
  priceRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 },
  priceCell: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 10px' },
  priceLbl: { color: 'var(--text-dim)', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' },
  priceVal: { fontSize: 14, fontWeight: 700, fontFamily: 'ui-monospace, monospace', marginTop: 2 },
  cardFoot: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, color: 'var(--text-dim)', fontSize: 12 },
  fab: { position: 'fixed', right: 18, bottom: 78, width: 56, height: 56, borderRadius: 'var(--r-pill)', background: 'var(--primary)', color: '#0A0B0E', fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxShadow: 'var(--glow-primary), var(--shadow-pop)', zIndex: 60 },
  payCard: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24, maxWidth: 440, margin: '0 auto', textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  lockIcon: { width: 52, height: 52, borderRadius: 'var(--r-md)', backgroundColor: 'rgba(199,249,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  payTitle: { color: 'var(--text)', fontSize: 18, margin: '0 0 6px' },
  payText: { color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: '0 0 18px' },
  payLabel: { display: 'block', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  divider: { display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-dim)', fontSize: 11, margin: '16px 0' },
};
