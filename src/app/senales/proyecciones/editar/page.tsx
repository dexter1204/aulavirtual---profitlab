'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjection, updateProjection, listTraders, type TraderOption, type ProjectionDirection, type ProjectionProbability, type Audience } from '@/lib/signals';
import { materialHref } from '@/lib/api';
import { Spinner, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function EditarProyeccionPage() {
  return <Suspense fallback={<Spinner />}><Editar /></Suspense>;
}

function Editar() {
  const router = useRouter();
  const id = Number(useSearchParams().get('id'));
  const { isAdmin, isLoading } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [traders, setTraders] = useState<TraderOption[]>([]);
  const [f, setF] = useState<any>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) { router.replace('/senales/proyecciones'); return; }
    Promise.all([fetchProjection(id), listTraders()]).then(([p, t]) => {
      setTraders(t);
      setF({ title: p.title, direction: p.direction, probability: p.probability, audience: p.audience, trader_id: p.trader_id ?? (t[0]?.id ?? ''), tv: p.tradingview_url ?? '', desc: p.description ?? '', image_url: p.image_url });
    }).catch((e) => toast(e.message, 'error')).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isLoading, id]);

  if (isLoading || loading || !f) return <Spinner />;
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const onImage = (file: File | null) => { setImage(file); setRemoveImage(false); if (file) { const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(file); } else setPreview(null); };
  const currentImg = removeImage ? null : (preview ?? (f.image_url ? materialHref(f.image_url) : null));
  const valid = f.title.trim() && f.trader_id;

  const submit = async () => {
    if (!valid) { toast('Completa título y trader.', 'error'); return; }
    setSaving(true);
    try {
      await updateProjection(id, { title: f.title.trim(), direction: f.direction, probability: f.probability, audience: f.audience, trader_id: f.trader_id, tradingview_url: f.tv.trim() || null, description: f.desc.trim() || null, imageFile: image, removeImage }, 'Proyección actualizada');
      toast('Proyección actualizada', 'success'); router.push(`/senales/proyecciones/detalle/?id=${id}`);
    } catch (e: any) { toast(e.message, 'error'); setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 12px 100px' }}>
      <div style={styles.topbar}>
        <Link href={`/senales/proyecciones/detalle/?id=${id}`} style={styles.cancel}>Cancelar</Link>
        <h1 style={styles.title}>Editar proyección</h1>
        <button onClick={submit} disabled={!valid || saving} style={{ ...styles.publish, opacity: valid && !saving ? 1 : 0.45 }}>{saving ? '…' : 'Guardar'}</button>
      </div>
      <L label="Trader"><select value={f.trader_id} onChange={(e) => set('trader_id', e.target.value)} style={inputStyle}>{traders.map((t) => <option key={t.id} value={t.id}>★ {t.name}</option>)}</select></L>
      <L label="Título"><input value={f.title} onChange={(e) => set('title', e.target.value)} style={inputStyle} /></L>
      <L label="Dirección"><Toggle options={[['alcista', '▲ Alcista', '#22c55e'], ['bajista', '▼ Bajista', '#ef4444']]} value={f.direction} onChange={(v) => set('direction', v as ProjectionDirection)} /></L>
      <L label="Probabilidad"><Toggle options={[['alta', 'Alta', '#22c55e'], ['media', 'Media', '#f59e0b'], ['baja', 'Baja', '#ef4444']]} value={f.probability} onChange={(v) => set('probability', v as ProjectionProbability)} /></L>
      <L label="Audiencia"><Toggle options={[['free', 'Free', '#94A3B8'], ['premium', 'Premium', '#C7F94C'], ['all', 'Todos', '#94A3B8']]} value={f.audience} onChange={(v) => set('audience', v as Audience)} /></L>
      <L label="Imagen">
        {currentImg ? <div><img src={currentImg} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 6 }} /><div style={{ display: 'flex', gap: 10 }}><label style={styles.changeImg}>📷 Cambiar<input type="file" accept="image/*" hidden onChange={(e) => onImage(e.target.files?.[0] ?? null)} /></label><button type="button" onClick={() => { setImage(null); setPreview(null); setRemoveImage(true); }} style={styles.removeImg}>✕ Quitar</button></div></div>
          : <input type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0] ?? null)} style={{ ...inputStyle, padding: 9 }} />}
      </L>
      <L label="Link TradingView"><input value={f.tv} onChange={(e) => set('tv', e.target.value)} style={{ ...inputStyle, color: '#C7F94C' }} /></L>
      <L label="Análisis / descripción"><textarea value={f.desc} onChange={(e) => set('desc', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></L>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginBottom: 12 }}><label style={styles.lbl}>{label}</label>{children}</div>; }
function Toggle({ options, value, onChange }: { options: [string, string, string][]; value: string; onChange: (v: string) => void }) {
  return <div style={styles.toggle}>{options.map(([v, label, color]) => <button key={v} type="button" onClick={() => onChange(v)} style={{ ...styles.toggleBtn, backgroundColor: value === v ? color : 'transparent', color: value === v ? '#0A0B0E' : '#94A3B8', fontWeight: value === v ? 700 : 500 }}>{label}</button>)}</div>;
}
const styles: Record<string, React.CSSProperties> = {
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  cancel: { color: '#94A3B8', fontSize: 14, textDecoration: 'none' },
  title: { color: '#F1F5F9', fontSize: 17, fontWeight: 700, margin: 0, fontFamily: 'var(--font-bricolage), sans-serif' },
  publish: { background: '#C7F94C', color: '#0A0B0E', border: 0, borderRadius: 10, padding: '9px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  lbl: { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  toggle: { display: 'flex', gap: 4, background: '#14161C', border: '1px solid #1F222B', borderRadius: 10, padding: 3 },
  toggleBtn: { flex: 1, border: 0, borderRadius: 8, padding: '9px 6px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 },
  changeImg: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 8, padding: '6px 12px', color: '#C7F94C', fontSize: 12, cursor: 'pointer' },
  removeImg: { background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
};
