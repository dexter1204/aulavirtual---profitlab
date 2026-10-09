'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getQuantState,
  redeemQuantCoupon,
  quantCheckout,
  verifyPayment,
  getToken,
  QUANT_URL,
  PREAPERTURA_URL,
  type QuantState,
} from '@/lib/api';
import { Page, PageTitle, Spinner, Button, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { IconChart, IconLock, IconCheck } from '@/components/icons';

type SubTab = 'exposiciones' | 'preapertura';

export default function MercadosPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Mercados />
    </Suspense>
  );
}

function Mercados() {
  const { session } = useAuth();
  const search = useSearchParams();
  const toast = useToast();
  const [state, setState] = useState<QuantState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setState(await getQuantState());
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      const pago = search.get('pago');
      const paymentId = search.get('payment_id') || search.get('collection_id');
      if (pago === 'ok' && paymentId) {
        try {
          const { ok } = await verifyPayment(paymentId);
          toast(ok ? '¡Pago aprobado! Acceso activado.' : 'Pago recibido, se activará en breve.', ok ? 'success' : 'info');
        } catch { /* ignore */ }
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (loading) return <Spinner />;
  if (!state) return null;
  if (state.has_access) return <MercadosHub state={state} />;
  return <Paywall onRedeemed={load} state={state} />;
}

function MercadosHub({ state }: { state: QuantState }) {
  const [tab, setTab] = useState<SubTab>('exposiciones');
  const token = getToken() ?? '';
  // Exposiciones (quant): token por hash. Pre-Apertura (Node): token por la
  // ruta /sso para que su servidor fije la sesión (SSO).
  const src = tab === 'exposiciones'
    ? `${QUANT_URL}#plq=${encodeURIComponent(token)}`
    : `${PREAPERTURA_URL}sso?token=${encodeURIComponent(token)}`;

  const until = state.lifetime
    ? 'Acceso vitalicio'
    : state.access_until
    ? `Acceso hasta ${new Date(state.access_until).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : null;

  return (
    <div style={{ padding: '14px 12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h1 style={styles.h1}><IconChart size={20} color="#C7F94C" /> Mercados</h1>
        {until && <span style={{ color: '#64748B', fontSize: 12 }}>{until}</span>}
      </div>

      <div style={styles.tabs}>
        {([['exposiciones', 'Exposiciones'], ['preapertura', 'Pre-Apertura']] as [SubTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...styles.tab, backgroundColor: tab === t ? '#C7F94C' : '#14161C', color: tab === t ? '#0A0B0E' : '#94A3B8', borderColor: tab === t ? '#C7F94C' : '#1F222B' }}
          >
            {label}
          </button>
        ))}
      </div>

      <iframe
        key={tab}
        src={src}
        title={tab === 'exposiciones' ? 'ProfitLab Quant — Exposiciones' : 'ProfitLab — Pre-Apertura'}
        style={{
          width: '100%',
          height: 'calc(100vh - 200px)',
          minHeight: 460,
          border: '1px solid #1F222B',
          borderRadius: 14,
          background: '#0A0B0E',
        }}
        allow="clipboard-write"
      />
    </div>
  );
}

function Paywall({ state, onRedeemed }: { state: QuantState; onRedeemed: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [paying, setPaying] = useState(false);

  const redeem = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { toast('Ingresa tu cupón', 'error'); return; }
    setRedeeming(true);
    try {
      await redeemQuantCoupon(c);
      toast('¡Acceso activado!', 'success');
      onRedeemed();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setRedeeming(false);
    }
  };

  const buy = async () => {
    setPaying(true);
    try {
      const { init_point } = await quantCheckout();
      window.location.href = init_point;
    } catch (e: any) {
      toast(e.message, 'error');
      setPaying(false);
    }
  };

  const priceTxt = state.price > 0
    ? `${state.currency === 'USD' ? '$' : state.currency + ' '}${state.price.toLocaleString('es')}`
    : null;
  const daysTxt = state.days > 0 ? `${state.days} días de acceso` : 'acceso vitalicio';

  return (
    <Page>
      <PageTitle title="Mercados" subtitle="Exposiciones de dealers (gamma/beta) + Pre-Apertura US (noticias, futuros y plan por índice)." />

      <div style={styles.card}>
        <div style={styles.lockIcon}><IconLock size={26} color="#C7F94C" /></div>
        <h2 style={styles.cardTitle}>Activa tu acceso</h2>
        <p style={styles.cardText}>
          Un solo acceso abre <b style={{ color: '#CBD5E1' }}>Exposiciones</b> y <b style={{ color: '#CBD5E1' }}>Pre-Apertura</b>.
          Canjea tu cupón o adquiérelo para entrar.
        </p>

        <label style={styles.label}>Tengo un cupón</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') redeem(); }}
            placeholder="CÓDIGO"
            style={{ ...inputStyle, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}
          />
          <Button onClick={redeem} disabled={redeeming}>{redeeming ? '…' : 'Canjear'}</Button>
        </div>

        {priceTxt && (
          <>
            <div style={styles.divider}>
              <span style={{ flex: 1, height: 1, background: '#1F222B' }} />O<span style={{ flex: 1, height: 1, background: '#1F222B' }} />
            </div>
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
  h1: { color: '#F1F5F9', fontSize: 22, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-bricolage), sans-serif', letterSpacing: -0.4 },
  tabs: { display: 'flex', gap: 8, marginBottom: 12 },
  tab: { flex: 1, maxWidth: 200, textAlign: 'center', border: '1px solid', borderRadius: 10, padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  card: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 16, padding: 24, maxWidth: 440, margin: '0 auto', textAlign: 'center' },
  lockIcon: { width: 52, height: 52, borderRadius: 13, backgroundColor: 'rgba(199,249,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  cardTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: 700, margin: '0 0 6px', fontFamily: 'var(--font-bricolage), sans-serif' },
  cardText: { color: '#94A3B8', fontSize: 13, lineHeight: 1.5, margin: '0 0 18px' },
  label: { display: 'block', textAlign: 'left', color: '#94A3B8', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  divider: { display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: 11, margin: '16px 0' },
};
