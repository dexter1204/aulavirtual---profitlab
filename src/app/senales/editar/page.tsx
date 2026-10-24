'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSignal, updateSignal, listTraders, type TraderOption, type Audience, type SignalDirection, type UpdateSignalInput } from '@/lib/signals';
import { Spinner, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function EditarSenalPage() {
  return <Suspense fallback={<Spinner />}><Editar /></Suspense>;
}

function Editar() {
  const router = useRouter();
  const search = useSearchParams();
  const id = Number(search.get('id'));
  const { isAdmin, isLoading } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [traders, setTraders] = useState<TraderOption[]>([]);
  const [f, setF] = useState<any>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) { router.replace('/senales'); return; }
    Promise.all([fetchSignal(id), listTraders()]).then(([s, t]) => {
      setTraders(t);
      setF({
        asset: s.asset, direction: s.direction, audience: s.audience, trader_id: s.trader_id ?? (t[0]?.id ?? ''),
        entry: s.entry_price, sl: s.stop_loss, tp1: s.take_profit_1, tp2: s.take_profit_2 ?? '', tp3: s.take_profit_3 ?? '', tp4: s.take_profit_4 ?? '',
        tv: s.tradingview_url ?? '', notes: s.notes ?? '', recs: s.recommendations ?? '',
      });
    }).catch((e) => toast(e.message, 'error')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isLoading, id]);

  if (isLoading || loading || !f) return <Spinner />;

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const valid = f.asset.trim() && f.entry && f.sl && f.tp1 && f.trader_id;

  const submit = async () => {
    if (!valid) { toast('Completa los campos obligatorios.', 'error'); return; }
    setSaving(true);
    try {
      const input: UpdateSignalInput = {
        asset: f.asset.trim(), direction: f.direction, audience: f.audience, trader_id: f.trader_id,
        entry_price: +f.entry, stop_loss: +f.sl, take_profit_1: +f.tp1,
        take_profit_2: f.tp2 ? +f.tp2 : null, take_profit_3: f.tp3 ? +f.tp3 : null, take_profit_4: f.tp4 ? +f.tp4 : null,
        tradingview_url: f.tv.trim() || null, notes: f.notes.trim() || null, recommendations: f.recs.trim() || null,
      };
      await updateSignal(id, input, 'Trade actualizado por el mentor');
      toast('Trade actualizado', 'success');
      router.push(`/senales/detalle/?id=${id}`);
    } catch (e: any) { toast(e.message, 'error'); setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 12px 100px' }}>
      <div style={styles.topbar}>
        <Link href={`/senales/detalle/?id=${id}`} className="pl-pressable" style={styles.cancel}>Cancelar</Link>
        <h1 className="pl-title" style={styles.title}>Editar señal</h1>
        <button onClick={submit} disabled={!valid || saving} className="pl-pressable" style={{ ...styles.publish, opacity: valid && !saving ? 1 : 0.45 }}>{saving ? '…' : 'Guardar'}</button>
      </div>
      <div style={styles.warn}>Los cambios se reflejan para todos los alumnos al instante.</div>

      <L label="Trader"><select value={f.trader_id} onChange={(e) => set('trader_id', e.target.value)} style={inputStyle}>{traders.map((t) => <option key={t.id} value={t.id}>★ {t.name}</option>)}</select></L>
      <L label="Activo"><input value={f.asset} onChange={(e) => set('asset', e.target.value.toUpperCase())} style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace', fontWeight: 700 }} /></L>
      <L label="Dirección"><Toggle options={[['long', 'LONG ▲', 'var(--long)'], ['short', 'SHORT ▼', 'var(--short)']]} value={f.direction} onChange={(v) => set('direction', v as SignalDirection)} /></L>
      <L label="Audiencia"><Toggle options={[['free', 'Free', 'var(--text-muted)'], ['premium', 'Premium', 'var(--primary)'], ['all', 'Todos', 'var(--text-muted)']]} value={f.audience} onChange={(v) => set('audience', v as Audience)} /></L>
      <div style={styles.grid2}>
        <L label="Entry"><input type="number" step="any" value={f.entry} onChange={(e) => set('entry', e.target.value)} style={inputStyle} /></L>
        <L label="Stop loss"><input type="number" step="any" value={f.sl} onChange={(e) => set('sl', e.target.value)} style={{ ...inputStyle, color: '#f87171' }} /></L>
      </div>
      <div style={styles.grid2}>
        <L label="TP1"><input type="number" step="any" value={f.tp1} onChange={(e) => set('tp1', e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></L>
        <L label="TP2"><input type="number" step="any" value={f.tp2} onChange={(e) => set('tp2', e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></L>
      </div>
      <div style={styles.grid2}>
        <L label="TP3"><input type="number" step="any" value={f.tp3} onChange={(e) => set('tp3', e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></L>
        <L label="TP4"><input type="number" step="any" value={f.tp4} onChange={(e) => set('tp4', e.target.value)} style={{ ...inputStyle, color: '#4ade80' }} /></L>
      </div>
      <L label="Link TradingView"><input value={f.tv} onChange={(e) => set('tv', e.target.value)} style={{ ...inputStyle, color: 'var(--primary)' }} /></L>
      <L label="Análisis / notas"><textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></L>
      <L label="Recomendaciones"><textarea value={f.recs} onChange={(e) => set('recs', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></L>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginBottom: 12 }}><label style={styles.lbl}>{label}</label>{children}</div>; }
function Toggle({ options, value, onChange }: { options: [string, string, string][]; value: string; onChange: (v: string) => void }) {
  return <div style={styles.toggle}>{options.map(([v, label, color]) => <button key={v} type="button" className="pl-pressable" onClick={() => onChange(v)} style={{ ...styles.toggleBtn, backgroundColor: value === v ? color : 'transparent', color: value === v ? '#0A0B0E' : 'var(--text-muted)', fontWeight: value === v ? 700 : 500 }}>{label}</button>)}</div>;
}

const styles: Record<string, React.CSSProperties> = {
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  cancel: { color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none' },
  title: { color: 'var(--text)', fontSize: 17, margin: 0 },
  publish: { background: 'var(--primary)', color: '#0A0B0E', border: 0, borderRadius: 'var(--r-sm)', padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  warn: { background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', color: '#FCD34D', fontSize: 12.5, borderRadius: 'var(--r-sm)', padding: '9px 12px', marginBottom: 14 },
  lbl: { display: 'block', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  toggle: { display: 'flex', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 3 },
  toggleBtn: { flex: 1, border: 0, borderRadius: 8, padding: '9px 6px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40, transition: 'background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)' },
};
