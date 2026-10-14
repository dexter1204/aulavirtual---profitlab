'use client';

import { useEffect, useState } from 'react';
import {
  listAccessCoupons,
  createAccessCoupon,
  deleteAccessCoupon,
  type AccessCoupon,
  type ProductKey,
} from '@/lib/api';
import { Page, PageTitle, Spinner, Button, Empty, Pill, inputStyle } from '@/components/ui';
import { AdminNav } from '@/components/AdminNav';
import { useToast } from '@/components/Toast';
import { IconTrash, IconTag } from '@/components/icons';

// Scopes que puede otorgar un cupón general. La lima queda para la voz de la app,
// así que cada producto lleva su color de identidad (validado, dataviz).
const SCOPES: { key: ProductKey; label: string; color: string }[] = [
  { key: 'quant', label: 'Quant', color: '#DE6BBE' },
  { key: 'signals', label: 'Señales', color: '#22B468' },
  { key: 'news', label: 'Pre-Apertura', color: '#4F86F7' },
];

const SCOPE_LABEL: Record<string, string> = { quant: 'Quant', signals: 'Señales', news: 'Pre-Apertura' };

export default function AdminAccesos() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<AccessCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [scopes, setScopes] = useState<ProductKey[]>(['quant', 'signals', 'news']);
  const [days, setDays] = useState('30');
  const [maxUses, setMaxUses] = useState('0');
  const [expiresAt, setExpiresAt] = useState(''); // fecha límite para canjear el cupón (YYYY-MM-DD)
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCoupons(await listAccessCoupons()); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggleScope = (k: ProductKey) =>
    setScopes((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const create = async () => {
    if (scopes.length === 0) { toast('Elige al menos un producto', 'error'); return; }
    setCreating(true);
    try {
      const r = await createAccessCoupon({
        code: code.trim() || undefined,
        scopes,
        days: parseInt(days, 10) || 0,
        max_uses: parseInt(maxUses, 10) || 0,
        // El canje valida contra expires_at: enviamos fin del día para que el
        // cupón siga válido durante toda la fecha elegida.
        expires_at: expiresAt ? `${expiresAt} 23:59:59` : null,
        note: note.trim() || null,
      });
      toast(`Cupón ${r.code} creado`, 'success');
      setCode(''); setNote(''); setDays('30'); setMaxUses('0'); setExpiresAt(''); setScopes(['quant', 'signals', 'news']);
      await load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const remove = async (c: AccessCoupon) => {
    if (!confirm(`¿Eliminar el cupón ${c.code}?`)) return;
    try { await deleteAccessCoupon(c.id); setCoupons((prev) => prev.filter((x) => x.id !== c.id)); toast('Cupón eliminado', 'info'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const allThree = scopes.length === 3;

  return (
    <Page>
      <PageTitle title="Accesos" subtitle="Cupones generales que desbloquean Quant, Señales y Pre-Apertura en un solo código." />
      <AdminNav />

      <div style={styles.panel}>
        <h3 style={styles.h3}>Nuevo cupón</h3>

        <span style={styles.lbl}>Productos que desbloquea</span>
        <div style={styles.scopes}>
          {SCOPES.map((s) => {
            const on = scopes.includes(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggleScope(s.key)}
                aria-pressed={on}
                style={{
                  ...styles.scope,
                  borderColor: on ? s.color : '#1F222B',
                  backgroundColor: on ? `${s.color}1F` : '#101217',
                  color: on ? '#F1F5F9' : '#8A93A3',
                }}
              >
                <span style={{ ...styles.scopeDot, backgroundColor: on ? s.color : '#2A2E39' }} />
                {s.label}
              </button>
            );
          })}
        </div>
        <p style={styles.scopeHint}>
          {allThree ? 'Cupón general: un solo código abre los tres productos premium.' : `Abre: ${scopes.map((k) => SCOPE_LABEL[k]).join(', ') || '—'}`}
        </p>

        <div style={styles.grid}>
          <label style={styles.field}><span style={styles.lbl}>Código (opcional)</span><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Se genera solo si lo dejas vacío" style={inputStyle} /></label>
          <label style={styles.field}>
            <span style={styles.lbl}>Cantidad de activaciones</span>
            <input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="0" style={inputStyle} />
            <span style={styles.help}>Cuántos alumnos pueden canjearlo. 0 = ilimitado.</span>
          </label>
          <label style={styles.field}>
            <span style={styles.lbl}>Vence el (opcional)</span>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={inputStyle} />
            <span style={styles.help}>Último día para canjear el cupón. Vacío = sin caducidad.</span>
          </label>
          <label style={styles.field}>
            <span style={styles.lbl}>Días de acceso</span>
            <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="30" style={inputStyle} />
            <span style={styles.help}>Cuánto dura el acceso del alumno tras canjear. 0 = vitalicio.</span>
          </label>
          <label style={styles.field}><span style={styles.lbl}>Nota (opcional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Promo octubre" style={inputStyle} /></label>
        </div>
        <Button onClick={create} disabled={creating} style={{ marginTop: 6 }}>{creating ? 'Creando…' : '+ Crear cupón'}</Button>
      </div>

      <h3 style={{ ...styles.h3, marginTop: 24 }}>Cupones ({coupons.length})</h3>
      {loading ? <Spinner /> : coupons.length === 0 ? (
        <Empty icon={<IconTag size={34} color="#64748B" />} title="Sin cupones" message="Crea un cupón general para dar acceso a los productos premium." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {coupons.map((c) => {
            const agotado = c.max_uses > 0 && c.uses >= c.max_uses;
            const vencido = !!c.expires_at && new Date(c.expires_at).getTime() < Date.now();
            const venceTxt = c.expires_at
              ? new Date(c.expires_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
              : null;
            const list = c.scopes.split(',').map((s) => s.trim()).filter(Boolean);
            return (
              <div key={c.id} style={styles.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={styles.code}>{c.code}</span>
                    <Pill color={c.days > 0 ? '#F59E0B' : '#C7F94C'}>{c.days > 0 ? `${c.days} días` : 'Vitalicio'}</Pill>
                    {venceTxt && <Pill color={vencido ? '#EF4444' : '#64748B'}>{vencido ? 'Vencido' : `Vence ${venceTxt}`}</Pill>}
                    {agotado && <Pill color="#EF4444">Agotado</Pill>}
                    {!c.active && <Pill color="#64748B">Inactivo</Pill>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {list.map((s) => {
                      const meta = SCOPES.find((x) => x.key === s);
                      return (
                        <span key={s} style={{ ...styles.scopeTag, color: meta?.color ?? '#94A3B8', borderColor: `${meta?.color ?? '#94A3B8'}55` }}>
                          {SCOPE_LABEL[s] ?? s}
                        </span>
                      );
                    })}
                  </div>
                  <div style={{ color: '#64748B', fontSize: 11, marginTop: 5 }}>Activaciones: {c.uses}{c.max_uses > 0 ? ` / ${c.max_uses}` : ' (ilimitado)'}{c.note ? ` · ${c.note}` : ''}</div>
                </div>
                <button onClick={() => remove(c)} style={styles.del} aria-label="Eliminar cupón"><IconTrash size={15} /></button>
              </div>
            );
          })}
        </div>
      )}

      <p style={styles.hint}>Los alumnos canjean estos códigos en <code>/canjear</code> dentro del app, o en las webs de cada producto.</p>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 16 },
  h3: { color: '#F1F5F9', fontSize: 15, fontWeight: 700, margin: '0 0 12px', fontFamily: 'var(--font-bricolage), sans-serif' },
  scopes: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  scope: { display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid', borderRadius: 999, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  scopeDot: { width: 8, height: 8, borderRadius: '50%', flex: '0 0 auto' },
  scopeHint: { color: '#64748B', fontSize: 11.5, margin: '8px 0 14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 6 },
  field: { display: 'block' },
  lbl: { display: 'block', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  help: { display: 'block', color: '#64748B', fontSize: 10.5, lineHeight: 1.4, marginTop: 5 },
  row: { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 10, padding: '10px 12px' },
  code: { color: '#F1F5F9', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-bricolage), monospace', letterSpacing: 1 },
  scopeTag: { fontSize: 10.5, fontWeight: 700, border: '1px solid', borderRadius: 6, padding: '2px 7px' },
  del: { background: 'transparent', border: 'none', color: '#FCA5A5', cursor: 'pointer', padding: 4, flexShrink: 0 },
  hint: { color: '#64748B', fontSize: 12, lineHeight: 1.6, marginTop: 20 },
};
