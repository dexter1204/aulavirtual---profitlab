'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createSignal, listTraders, type TraderOption, type Audience, type SignalDirection } from '@/lib/signals';
import { Spinner, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { stripBase } from '@/lib/basePath';

export default function NuevaSenalPage() {
  const router = useRouter();
  const { isAdmin, isLoading, profile } = useAuth();
  const toast = useToast();

  const [traders, setTraders] = useState<TraderOption[]>([]);
  const [traderId, setTraderId] = useState('');
  const [asset, setAsset] = useState('XAUUSD');
  const [direction, setDirection] = useState<SignalDirection>('long');
  const [audience, setAudience] = useState<Audience>('all');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp1, setTp1] = useState('');
  const [tp2, setTp2] = useState('');
  const [tp3, setTp3] = useState('');
  const [tp4, setTp4] = useState('');
  const [tv, setTv] = useState('');
  const [notes, setNotes] = useState('');
  const [recs, setRecs] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) { router.replace('/senales'); return; }
    listTraders().then((t) => { setTraders(t); setTraderId((prev) => prev || profile?.id || (t[0]?.id ?? '')); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isLoading]);

  const valid = asset.trim() && entry && sl && tp1 && traderId &&
    !isNaN(+entry) && !isNaN(+sl) && !isNaN(+tp1);

  const submit = async () => {
    if (!valid) { toast('Completa activo, entrada, SL, TP1 y trader.', 'error'); return; }
    setSaving(true);
    try {
      await createSignal({
        asset: asset.trim(), direction, audience, trader_id: traderId,
        entry_price: +entry, stop_loss: +sl, take_profit_1: +tp1,
        take_profit_2: tp2 ? +tp2 : null, take_profit_3: tp3 ? +tp3 : null, take_profit_4: tp4 ? +tp4 : null,
        tradingview_url: tv.trim() || null, notes: notes.trim() || null, recommendations: recs.trim() || null,
        imageFile: image,
      });
      toast('Señal publicada', 'success');
      router.push('/senales');
    } catch (e: any) { toast(e.message, 'error'); setSaving(false); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 12px 100px' }}>
      <div style={styles.topbar}>
        <Link href="/senales" style={styles.cancel}>Cancelar</Link>
        <h1 style={styles.title}>Nueva señal</h1>
        <button onClick={submit} disabled={!valid || saving} style={{ ...styles.publish, opacity: valid && !saving ? 1 : 0.45 }}>
          {saving ? '…' : 'Publicar'}
        </button>
      </div>

      <L label="Trader">
        <select value={traderId} onChange={(e) => setTraderId(e.target.value)} style={inputStyle}>
          {traders.map((t) => <option key={t.id} value={t.id}>★ {t.name}</option>)}
        </select>
      </L>

      <L label="Activo">
        <input value={asset} onChange={(e) => setAsset(e.target.value.toUpperCase())} placeholder="XAUUSD" style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', fontWeight: 700 }} />
      </L>

      <L label="Dirección">
        <Toggle options={[['long', 'LONG ▲', '#22c55e'], ['short', 'SHORT ▼', '#ef4444']]} value={direction} onChange={(v) => setDirection(v as SignalDirection)} />
      </L>

      <L label="Audiencia">
        <Toggle options={[['free', 'Free', '#94A3B8'], ['premium', 'Premium', '#C7F94C'], ['all', 'Todos', '#94A3B8']]} value={audience} onChange={(v) => setAudience(v as Audience)} />
      </L>

      <div style={styles.grid2}>
        <L label="Entry"><input type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} style={inputStyle} /></L>
        <L label="Stop loss"><input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} style={{ ...inputStyle, color: '#f87171' }} /></L>
      </div>
      <div style={styles.grid2}>
        <L label="TP1 (obligatorio)"><input type="number" step="any" value={tp1} onChange={(e) => setTp1(e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></L>
        <L label="TP2"><input type="number" step="any" value={tp2} onChange={(e) => setTp2(e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></L>
      </div>
      <div style={styles.grid2}>
        <L label="TP3"><input type="number" step="any" value={tp3} onChange={(e) => setTp3(e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></L>
        <L label="TP4"><input type="number" step="any" value={tp4} onChange={(e) => setTp4(e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></L>
      </div>

      <L label="Link TradingView (opcional)"><input value={tv} onChange={(e) => setTv(e.target.value)} placeholder="https://www.tradingview.com/x/…" style={{ ...inputStyle, color: '#C7F94C' }} /></L>
      <L label="Imagen del gráfico (opcional)"><input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} style={{ ...inputStyle, padding: 9 }} /></L>
      <L label="Análisis / notas (opcional)"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></L>
      <L label="Recomendaciones del trade (opcional)"><textarea value={recs} onChange={(e) => setRecs(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></L>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={styles.lbl}>{label}</label>
      {children}
    </div>
  );
}
function Toggle({ options, value, onChange }: { options: [string, string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={styles.toggle}>
      {options.map(([v, label, color]) => (
        <button key={v} onClick={() => onChange(v)} type="button"
          style={{ ...styles.toggleBtn, backgroundColor: value === v ? color : 'transparent', color: value === v ? '#0A0B0E' : '#94A3B8', fontWeight: value === v ? 700 : 500 }}>
          {label}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  cancel: { color: '#94A3B8', fontSize: 14, textDecoration: 'none' },
  title: { color: '#F1F5F9', fontSize: 17, fontWeight: 700, margin: 0, fontFamily: 'var(--font-bricolage), sans-serif' },
  publish: { background: '#C7F94C', color: '#0A0B0E', border: 0, borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  lbl: { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  toggle: { display: 'flex', gap: 4, background: '#14161C', border: '1px solid #1F222B', borderRadius: 10, padding: 3 },
  toggleBtn: { flex: 1, border: 0, borderRadius: 8, padding: '9px 6px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 },
};
