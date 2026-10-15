'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { createProjection, listTraders, type TraderOption, type ProjectionDirection, type ProjectionProbability, type Audience } from '@/lib/signals';
import { Spinner, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function NuevaProyeccionPage() {
  const router = useRouter();
  const { isAdmin, isLoading, profile } = useAuth();
  const toast = useToast();
  const [traders, setTraders] = useState<TraderOption[]>([]);
  const [traderId, setTraderId] = useState('');
  const [title, setTitle] = useState('');
  const [direction, setDirection] = useState<ProjectionDirection>('alcista');
  const [probability, setProbability] = useState<ProjectionProbability>('alta');
  const [audience, setAudience] = useState<Audience>('all');
  const [tv, setTv] = useState('');
  const [desc, setDesc] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) { router.replace('/senales/proyecciones'); return; }
    listTraders().then((t) => { setTraders(t); setTraderId((p) => p || profile?.id || (t[0]?.id ?? '')); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isLoading]);

  const onImage = (f: File | null) => { setImage(f); if (f) { const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f); } else setPreview(null); };
  const valid = title.trim() && traderId;

  const submit = async () => {
    if (!valid) { toast('Completa título y trader.', 'error'); return; }
    setSaving(true);
    try {
      await createProjection({ title: title.trim(), direction, probability, audience, trader_id: traderId, tradingview_url: tv.trim() || null, description: desc.trim() || null, imageFile: image });
      toast('Proyección publicada', 'success'); router.push('/senales/proyecciones');
    } catch (e: any) { toast(e.message, 'error'); setSaving(false); }
  };

  if (isLoading) return <Spinner />;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 12px 100px' }}>
      <div style={styles.topbar}>
        <Link href="/senales/proyecciones" style={styles.cancel}>Cancelar</Link>
        <h1 style={styles.title}>Nueva proyección</h1>
        <button onClick={submit} disabled={!valid || saving} style={{ ...styles.publish, opacity: valid && !saving ? 1 : 0.45 }}>{saving ? '…' : 'Publicar'}</button>
      </div>
      <L label="Trader"><select value={traderId} onChange={(e) => setTraderId(e.target.value)} style={inputStyle}>{traders.map((t) => <option key={t.id} value={t.id}>★ {t.name}</option>)}</select></L>
      <L label="Título"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Nasdaq busca liquidez semanal" style={inputStyle} /></L>
      <L label="Dirección"><Toggle options={[['alcista', '▲ Alcista', '#22c55e'], ['bajista', '▼ Bajista', '#ef4444']]} value={direction} onChange={(v) => setDirection(v as ProjectionDirection)} /></L>
      <L label="Probabilidad"><Toggle options={[['alta', 'Alta', '#22c55e'], ['media', 'Media', '#f59e0b'], ['baja', 'Baja', '#ef4444']]} value={probability} onChange={(v) => setProbability(v as ProjectionProbability)} /></L>
      <L label="Audiencia"><Toggle options={[['free', 'Free', '#94A3B8'], ['premium', 'Premium', '#C7F94C'], ['all', 'Todos', '#94A3B8']]} value={audience} onChange={(v) => setAudience(v as Audience)} /></L>
      <L label="Imagen del análisis (opcional)">
        {preview ? <div><img src={preview} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 6 }} /><button type="button" onClick={() => onImage(null)} style={styles.removeImg}>✕ Quitar imagen</button></div>
          : <input type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0] ?? null)} style={{ ...inputStyle, padding: 9 }} />}
      </L>
      <L label="Link TradingView (opcional)"><input value={tv} onChange={(e) => setTv(e.target.value)} style={{ ...inputStyle, color: '#C7F94C' }} /></L>
      <L label="Análisis / descripción"><textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></L>
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
  removeImg: { background: 'none', border: 'none', color: '#f87171', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
};
