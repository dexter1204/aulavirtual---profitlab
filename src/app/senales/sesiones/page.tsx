'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchSessions, createSession, deleteSession, summarizeSessions, SESSION_META,
  type OperatingSession, type SessionType, type Audience,
} from '@/lib/signals';
import { Spinner, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { SignalsTabs } from '@/components/SignalsTabs';

type Period = 'today' | 'week' | 'month' | 'year' | 'all';
const PERIODS: [Period, string][] = [['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['year', 'Año'], ['all', 'Todo']];

function periodStart(p: Period): Date | null {
  const now = new Date();
  if (p === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === 'week') { const d = new Date(now); d.setDate(now.getDate() - 7); return d; }
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === 'year') return new Date(now.getFullYear(), 0, 1);
  return null;
}

export default function SesionesPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [all, setAll] = useState<OperatingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [period, setPeriod] = useState<Period>('month');
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setLoading(true);
    fetchSessions().then((s) => { setAll(s); setDenied(false); })
      .catch((e: any) => { if (String(e.message).includes('acceso')) setDenied(true); else toast(e.message, 'error'); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const shown = useMemo(() => {
    const start = periodStart(period);
    return all.filter((s) => !start || new Date(s.session_date) >= start);
  }, [all, period]);
  const summary = summarizeSessions(shown);

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 12px 100px' }}>
      <SignalsTabs />
      <Link href="/senales/conteo" className="pl-pressable" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>← Conteo</Link>
      <h1 className="pl-title" style={styles.h1}>Sesiones operativas</h1>

      <div style={styles.filters}>{PERIODS.map(([p, label]) => <button key={p} onClick={() => setPeriod(p)} className="pl-pressable" style={{ ...styles.pill, backgroundColor: period === p ? 'var(--primary)' : 'var(--surface)', color: period === p ? '#0A0B0E' : 'var(--text-muted)', borderColor: period === p ? 'var(--primary)' : 'var(--border)' }}>{label}</button>)}</div>

      {denied ? (
        <div style={styles.denied}>Necesitas acceso a las señales. <Link href="/senales" style={{ color: 'var(--primary)' }}>Activar</Link></div>
      ) : loading ? <Spinner /> : (
        <>
          <div style={styles.summary}>
            <SB label="RR total" value={`${summary.totalRR >= 0 ? '+' : ''}${summary.totalRR}`} color={summary.totalRR >= 0 ? 'var(--primary)' : '#f87171'} />
            <SB label="Sesiones" value={String(summary.sessionsCount)} />
            <SB label="Positivas" value={String(summary.positiveCount)} color="#4ade80" />
            <SB label="Negativas" value={String(summary.negativeCount)} color="#f87171" />
          </div>

          {isAdmin && (showForm
            ? <SessionForm onDone={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
            : <button onClick={() => setShowForm(true)} className="pl-pressable" style={styles.addBtn}>+ Registrar sesión del día</button>)}

          <div style={styles.secLabel}>Historial · {PERIODS.find(([p]) => p === period)?.[1]}</div>
          {shown.length === 0 ? <div style={styles.empty}>Sin sesiones en este periodo.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shown.map((s) => {
                const meta = SESSION_META[s.session_type];
                const rr = parseFloat(s.result_rr);
                return (
                  <div key={s.id} style={styles.card}>
                    <div style={{ ...styles.icon, background: `${meta.color}22` }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: meta.color, fontSize: 13, fontWeight: 700 }}>{meta.label}{s.audience === 'premium' && ' · 💎'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(s.session_date).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' })}{s.trades_count ? ` · ${s.trades_count} trades` : ''}{s.author ? ` · ★ ${s.author.name.split(' ')[0]}` : ''}</div>
                      {s.note && <div style={{ color: '#CBD5E1', fontSize: 12.5, marginTop: 4 }}>{s.note}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: rr > 0 ? 'var(--primary)' : rr < 0 ? '#f87171' : 'var(--text-muted)', fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>{rr > 0 ? '+' : ''}{rr.toFixed(2)} RR</div>
                      {isAdmin && <button onClick={() => { if (confirm('¿Eliminar sesión?')) deleteSession(s.id).then(load).catch((e) => toast(e.message, 'error')); }} className="pl-pressable" style={styles.del}>Eliminar</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [type, setType] = useState<SessionType>('ny');
  const [rr, setRr] = useState('');
  const [trades, setTrades] = useState('');
  const [note, setNote] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (rr === '' || isNaN(+rr)) { toast('Ingresa el RR del día.', 'error'); return; }
    setSaving(true);
    try {
      await createSession({ session_date: date, session_type: type, result_rr: +rr, trades_count: trades ? +trades : 0, note: note.trim() || null, audience });
      toast('Sesión registrada', 'success'); onDone();
    } catch (e: any) { toast(e.message, 'error'); setSaving(false); }
  };

  return (
    <div style={styles.form}>
      <div style={styles.grid2}>
        <div><label style={styles.lbl}>Fecha</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></div>
        <div><label style={styles.lbl}>RR del día</label><input type="number" step="any" value={rr} onChange={(e) => setRr(e.target.value)} style={inputStyle} /></div>
      </div>
      <label style={styles.lbl}>Sesión</label>
      <div style={styles.sessGrid}>{(Object.keys(SESSION_META) as SessionType[]).map((t) => <button key={t} type="button" className="pl-pressable" onClick={() => setType(t)} style={{ ...styles.sessBtn, borderColor: type === t ? SESSION_META[t].color : 'var(--border)', color: type === t ? SESSION_META[t].color : 'var(--text-muted)' }}>{SESSION_META[t].icon} {SESSION_META[t].label}</button>)}</div>
      <div style={styles.grid2}>
        <div><label style={styles.lbl}># Trades</label><input type="number" value={trades} onChange={(e) => setTrades(e.target.value)} style={inputStyle} /></div>
        <div><label style={styles.lbl}>Audiencia</label><select value={audience} onChange={(e) => setAudience(e.target.value as Audience)} style={inputStyle}><option value="all">Todos</option><option value="premium">Premium</option><option value="free">Free</option></select></div>
      </div>
      <label style={styles.lbl}>Nota</label><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={onCancel} className="pl-pressable" style={styles.cancelBtn}>Cancelar</button>
        <button onClick={save} disabled={saving} className="pl-pressable" style={styles.saveBtn}>{saving ? '…' : 'Guardar'}</button>
      </div>
    </div>
  );
}

function SB({ label, value, color = 'var(--text)' }: { label: string; value: string; color?: string }) {
  return <div style={styles.sb}><div style={{ color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div><div style={{ color, fontSize: 18, fontWeight: 800, fontFamily: 'ui-monospace, monospace', marginTop: 3 }}>{value}</div></div>;
}

const styles: Record<string, React.CSSProperties> = {
  h1: { color: 'var(--text)', fontSize: 22, margin: '8px 0 12px' },
  filters: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  pill: { border: '1px solid', borderRadius: 'var(--r-pill)', padding: '7px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 36, transition: 'background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)' },
  denied: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 },
  summary: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 },
  sb: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 8px', textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  addBtn: { width: '100%', background: 'rgba(199,249,76,.12)', color: 'var(--primary)', border: '1px solid rgba(199,249,76,.4)', borderRadius: 'var(--r-md)', padding: 13, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 },
  secLabel: { color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', margin: '4px 0 10px' },
  empty: { color: 'var(--text-dim)', fontSize: 14, textAlign: 'center', padding: '30px 0' },
  card: { display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 12, boxShadow: 'var(--shadow-card)' },
  icon: { width: 40, height: 40, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 },
  del: { background: 'none', border: 'none', color: '#f87171', fontSize: 11, cursor: 'pointer', marginTop: 4, fontFamily: 'inherit' },
  form: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 16, boxShadow: 'var(--shadow-card)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  lbl: { display: 'block', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  sessGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 },
  sessBtn: { background: 'var(--bg)', border: '1px solid', borderRadius: 'var(--r-sm)', padding: '10px 8px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)' },
  cancelBtn: { flex: 1, background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 12, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },
  saveBtn: { flex: 1, background: 'var(--primary)', color: '#0A0B0E', border: 0, borderRadius: 'var(--r-sm)', padding: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
};
