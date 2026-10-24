'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { redeemAccessCoupon, type ProductKey } from '@/lib/api';
import { PRODUCTS } from '@/lib/products';
import { Page, PageTitle, Button, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { IconCheck, IconTag } from '@/components/icons';

export default function CanjearPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [unlocked, setUnlocked] = useState<ProductKey[] | null>(null);

  const redeem = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { toast('Ingresa tu cupón', 'error'); return; }
    setRedeeming(true);
    try {
      const res = await redeemAccessCoupon(c);
      setUnlocked(res.unlocked);
      toast('¡Cupón canjeado!', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setRedeeming(false);
    }
  };

  if (!session) return null;

  // ----- Estado de éxito -----
  if (unlocked) {
    const names = unlocked
      .map((k) => PRODUCTS.find((p) => p.key === k))
      .filter(Boolean) as (typeof PRODUCTS)[number][];
    return (
      <Page>
        <div style={styles.successWrap}>
          <div style={styles.seal}><IconCheck size={30} color="#2FBF71" /></div>
          <h1 className="pl-title" style={styles.successTitle}>¡Listo!</h1>
          <p style={styles.successText}>
            Tu cupón desbloqueó {names.length === 1 ? 'un producto' : `${names.length} productos`}.
          </p>

          <div style={styles.unlockedList}>
            {names.map((p) => (
              <div key={p.key} style={styles.unlockedRow}>
                <span style={{ ...styles.dot, backgroundColor: p.color }} />
                <span style={styles.unlockedName}>{p.name}</span>
                <span style={styles.unlockedState}>Activo</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <Link href="/inicio" style={{ textDecoration: 'none' }}>
              <Button full>Ir a mis productos</Button>
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  // ----- Formulario -----
  return (
    <Page>
      <PageTitle title="Canjear cupón" subtitle="Ingresa tu código para activar tus productos premium." />
      <div style={styles.card}>
        <div style={styles.tagIcon}><IconTag size={24} color="var(--primary)" /></div>
        <p style={styles.cardText}>
          Un <b style={{ color: '#CBD3DF' }}>cupón general</b> activa Señales, Pre-Apertura y Quant de una sola vez.
          También funciona en las webs.
        </p>
        <label style={styles.label}>Código del cupón</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') redeem(); }}
            placeholder="PLQ-XXXXXX"
            autoCapitalize="characters"
            autoCorrect="off"
            style={{ ...inputStyle, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase' }}
          />
          <Button onClick={redeem} disabled={redeeming}>{redeeming ? '…' : 'Canjear'}</Button>
        </div>
      </div>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 22, maxWidth: 440, margin: '0 auto', textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  tagIcon: { width: 50, height: 50, borderRadius: 'var(--r-md)', backgroundColor: 'rgba(199,249,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  cardText: { color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: '0 0 18px' },
  label: { display: 'block', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  successWrap: { textAlign: 'center', maxWidth: 440, margin: '0 auto', paddingTop: 10 },
  seal: { width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(47,191,113,0.14)', border: '1px solid rgba(47,191,113,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' },
  successTitle: { color: 'var(--text)', fontSize: 24, margin: 0 },
  successText: { color: 'var(--text-muted)', fontSize: 13.5, margin: '8px 0 0' },
  unlockedList: { display: 'flex', flexDirection: 'column', gap: 9, marginTop: 20, textAlign: 'left' },
  unlockedRow: { display: 'flex', alignItems: 'center', gap: 11, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '11px 13px', boxShadow: 'var(--shadow-card)' },
  dot: { width: 10, height: 10, borderRadius: 3, flex: '0 0 auto' },
  unlockedName: { flex: 1, color: 'var(--text)', fontSize: 14, fontWeight: 700 },
  unlockedState: { color: '#2FBF71', fontSize: 11, fontWeight: 700 },
};
