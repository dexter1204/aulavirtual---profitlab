'use client';

import { useEffect, useState } from 'react';
import { listSignalsCoupons, createSignalsCoupon, deleteSignalsCoupon, type SignalsCoupon } from '@/lib/signals';
import { Page, PageTitle, Spinner, Button, Empty, Pill, inputStyle } from '@/components/ui';
import { AdminNav } from '@/components/AdminNav';
import { useToast } from '@/components/Toast';
import { IconTrash, IconTag } from '@/components/icons';

export default function AdminSenales() {
  const toast = useToast();
  const [coupons, setCoupons] = useState<SignalsCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [days, setDays] = useState('30');
  const [maxUses, setMaxUses] = useState('0');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCoupons(await listSignalsCoupons()); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const create = async () => {
    setCreating(true);
    try {
      const r = await createSignalsCoupon({ code: code.trim() || undefined, days: parseInt(days, 10) || 0, max_uses: parseInt(maxUses, 10) || 0, note: note.trim() || null });
      toast(`Cupón ${r.code} creado`, 'success');
      setCode(''); setNote(''); setDays('30'); setMaxUses('0'); await load();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setCreating(false); }
  };

  const remove = async (c: SignalsCoupon) => {
    if (!confirm(`¿Eliminar el cupón ${c.code}?`)) return;
    try { await deleteSignalsCoupon(c.id); setCoupons((prev) => prev.filter((x) => x.id !== c.id)); toast('Cupón eliminado', 'info'); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  return (
    <Page>
      <PageTitle title="Señales" subtitle="Cupones de acceso a la sección de Señales / Proyecciones / Conteo." />
      <AdminNav />

      <div style={styles.panel}>
        <h3 className="pl-title" style={styles.h3}>Nuevo cupón</h3>
        <div style={styles.grid}>
          <label style={styles.field}><span style={styles.lbl}>Código (opcional)</span><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Se genera solo si lo dejas vacío" style={inputStyle} /></label>
          <label style={styles.field}><span style={styles.lbl}>Días de acceso (0 = vitalicio)</span><input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={inputStyle} /></label>
          <label style={styles.field}><span style={styles.lbl}>Usos máx. (0 = ilimitado)</span><input value={maxUses} onChange={(e) => setMaxUses(e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={inputStyle} /></label>
          <label style={styles.field}><span style={styles.lbl}>Nota (opcional)</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Promo octubre" style={inputStyle} /></label>
        </div>
        <Button onClick={create} disabled={creating} style={{ marginTop: 6 }}>{creating ? 'Creando…' : '+ Crear cupón'}</Button>
      </div>

      <h3 className="pl-title" style={{ ...styles.h3, marginTop: 24 }}>Cupones ({coupons.length})</h3>
      {loading ? <Spinner /> : coupons.length === 0 ? (
        <Empty icon={<IconTag size={34} color="#64748B" />} title="Sin cupones" message="Crea un cupón para dar acceso a Señales." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 8 }}>
          {coupons.map((c) => {
            const agotado = c.max_uses > 0 && c.uses >= c.max_uses;
            return (
              <div key={c.id} style={styles.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={styles.code}>{c.code}</span>
                    <Pill color={c.days > 0 ? '#F59E0B' : '#C7F94C'}>{c.days > 0 ? `${c.days} días` : 'Vitalicio'}</Pill>
                    {agotado && <Pill color="#EF4444">Agotado</Pill>}
                    {!c.active && <Pill color="#64748B">Inactivo</Pill>}
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>Usos: {c.uses}{c.max_uses > 0 ? ` / ${c.max_uses}` : ' (ilimitado)'}{c.note ? ` · ${c.note}` : ''}</div>
                </div>
                <button onClick={() => remove(c)} className="pl-pressable" style={styles.del} aria-label="Eliminar cupón"><IconTrash size={15} /></button>
              </div>
            );
          })}
        </div>
      )}

      <p style={styles.hint}>El precio de compra se define en <code>api/config.php</code>: <code>signals_price</code>, <code>signals_currency</code> y <code>signals_access_days</code>.</p>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, boxShadow: 'var(--shadow-card)' },
  h3: { color: 'var(--text)', fontSize: 15, margin: '0 0 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 6 },
  field: { display: 'block' },
  lbl: { display: 'block', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  row: { display: 'flex', alignItems: 'center', gap: 10, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', boxShadow: 'var(--shadow-card)' },
  code: { color: 'var(--text)', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-bricolage), monospace', letterSpacing: 1 },
  del: { background: 'transparent', border: 'none', color: '#FCA5A5', cursor: 'pointer', padding: 4, flexShrink: 0 },
  hint: { color: 'var(--text-dim)', fontSize: 12, lineHeight: 1.6, marginTop: 20 },
};
