'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Quant nativo: cliente-only (Plotly usa WebGL/DOM) → nunca en el prerender del export.
const QuantView = dynamic(
  () => import('@/components/quant/QuantView').then((m) => m.QuantView),
  { ssr: false, loading: () => <div style={{ padding: 24, color: 'var(--text-muted)' }}>Cargando Mercados…</div> },
);
import { useAuth } from '@/contexts/AuthContext';
import {
  getAccess,
  getQuantState,
  redeemAccessCoupon,
  quantCheckout,
  verifyPayment,
  getToken,
  QUANT_URL,
  PREAPERTURA_URL,
  type AccessState,
  type ProductAccess,
  type QuantState,
} from '@/lib/api';
import { Page, PageTitle, Spinner, Button, inputStyle } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { IconChart, IconLock, IconCheck, IconTag, IconArrowRight } from '@/components/icons';

type SubTab = 'exposiciones' | 'preapertura';

// Cada sub-sección se abre con un producto distinto del modelo unificado.
const TAB_PRODUCT: Record<SubTab, 'quant' | 'news'> = { exposiciones: 'quant', preapertura: 'news' };
const TAB_META: Record<SubTab, { label: string; color: string }> = {
  exposiciones: { label: 'Exposiciones', color: '#DE6BBE' }, // Quant
  preapertura: { label: 'Pre-Apertura', color: '#4F86F7' },  // News
};

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
  const [access, setAccess] = useState<AccessState | null>(null);
  const [quant, setQuant] = useState<QuantState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [a, q] = await Promise.all([getAccess(), getQuantState()]);
      setAccess(a);
      setQuant(q);
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
  if (!access) return null;

  const hasQuant = !!access.products?.quant?.has_access;
  const hasNews = !!access.products?.news?.has_access;

  // Sin ninguno de los dos productos → muro de pago unificado.
  if (!hasQuant && !hasNews) return <Paywall onRedeemed={load} quant={quant} />;

  return <MercadosHub access={access} />;
}

function MercadosHub({ access }: { access: AccessState }) {
  const search = useSearchParams();
  const hasQuant = !!access.products?.quant?.has_access;
  const hasNews = !!access.products?.news?.has_access;

  // Tab inicial: respeta ?tab=, si no cae en el que el usuario sí tiene.
  const initial: SubTab = useMemo(() => {
    const q = (search.get('tab') || '').toLowerCase();
    if (q === 'preapertura') return 'preapertura';
    if (q === 'exposiciones') return 'exposiciones';
    return hasQuant ? 'exposiciones' : 'preapertura';
  }, [search, hasQuant]);

  const [tab, setTab] = useState<SubTab>(initial);
  const token = getToken() ?? '';
  const product = TAB_PRODUCT[tab];
  const unlocked = tab === 'exposiciones' ? hasQuant : hasNews;

  // Exposiciones (quant): token por hash. Pre-Apertura (Node): token por la
  // ruta /sso para que su servidor fije la sesión (SSO).
  const src = tab === 'exposiciones'
    ? `${QUANT_URL}#plq=${encodeURIComponent(token)}`
    : `${PREAPERTURA_URL}sso?token=${encodeURIComponent(token)}`;

  const pa: ProductAccess | undefined = access.products?.[product];
  const until = pa?.lifetime
    ? 'Acceso vitalicio'
    : pa?.access_until
    ? `Acceso hasta ${new Date(pa.access_until).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}`
    : null;

  return (
    <div style={{ padding: '14px 12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <h1 className="pl-title" style={styles.h1}><IconChart size={20} color="var(--primary)" /> Mercados</h1>
        {unlocked && until && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{until}</span>}
      </div>

      <div style={styles.tabs}>
        {(['exposiciones', 'preapertura'] as SubTab[]).map((t) => {
          const active = tab === t;
          const open = t === 'exposiciones' ? hasQuant : hasNews;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="pl-pressable"
              style={{ ...styles.tab, backgroundColor: active ? 'var(--primary)' : 'var(--surface)', color: active ? 'var(--bg)' : 'var(--text-muted)', borderColor: active ? 'var(--primary)' : 'var(--border)' }}
            >
              {TAB_META[t].label}
              {!open && <IconLock size={12} color={active ? 'var(--bg)' : 'var(--text-dim)'} />}
            </button>
          );
        })}
      </div>

      {!unlocked ? (
        <TabLocked tab={tab} />
      ) : tab === 'exposiciones' ? (
        // Quant NATIVO (ya no iframe): pantallas React con Plotly, mismo token/tema.
        <QuantView />
      ) : (
        <iframe
          key={tab}
          src={src}
          title="ProfitLab — Pre-Apertura"
          style={{
            width: '100%',
            height: 'calc(100vh - 200px)',
            minHeight: 460,
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            background: 'var(--bg)',
          }}
          allow="clipboard-write"
        />
      )}
    </div>
  );
}

// Candado por sección: el usuario tiene acceso al otro producto pero no a este.
function TabLocked({ tab }: { tab: SubTab }) {
  const meta = TAB_META[tab];
  return (
    <div style={styles.locked}>
      <div style={{ ...styles.lockIconSm, backgroundColor: `${meta.color}1F` }}><IconLock size={22} color={meta.color} /></div>
      <h2 className="pl-title" style={styles.lockedTitle}>{meta.label} está bloqueado</h2>
      <p style={styles.lockedText}>
        Tu acceso actual no incluye {meta.label}. Canjea un cupón que lo desbloquee para entrar.
      </p>
      <Link href="/canjear" className="pl-pressable" style={styles.lockedCta}>
        <IconTag size={16} color="var(--primary)" /> Canjear un cupón <IconArrowRight size={15} color="var(--primary)" />
      </Link>
    </div>
  );
}

function Paywall({ quant, onRedeemed }: { quant: QuantState | null; onRedeemed: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [paying, setPaying] = useState(false);

  const redeem = async () => {
    const c = code.trim().toUpperCase();
    if (!c) { toast('Ingresa tu cupón', 'error'); return; }
    setRedeeming(true);
    try {
      const { unlocked } = await redeemAccessCoupon(c);
      const names = (unlocked || []).map((k) => ({ quant: 'Quant', signals: 'Señales', news: 'Pre-Apertura' }[k] ?? k));
      toast(names.length ? `¡Acceso activado! ${names.join(', ')}` : '¡Acceso activado!', 'success');
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

  const priceTxt = quant && quant.price > 0
    ? `${quant.currency === 'USD' ? '$' : quant.currency + ' '}${quant.price.toLocaleString('es')}`
    : null;
  const daysTxt = quant && quant.days > 0 ? `${quant.days} días de acceso` : 'acceso vitalicio';

  return (
    <Page>
      <PageTitle title="Mercados" subtitle="Exposiciones de dealers (gamma/beta) + Pre-Apertura US (noticias, futuros y plan por índice)." />

      <div style={styles.card}>
        <div style={styles.lockIcon}><IconLock size={26} color="var(--primary)" /></div>
        <h2 className="pl-title" style={styles.cardTitle}>Activa tu acceso</h2>
        <p style={styles.cardText}>
          Canjea tu cupón general para abrir <b style={{ color: '#CBD5E1' }}>Exposiciones</b> y <b style={{ color: '#CBD5E1' }}>Pre-Apertura</b>.
          Cada cupón desbloquea los productos que tenga asignados.
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
              <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />O<span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <Button variant="outline" full onClick={buy} disabled={paying}>
              <IconCheck size={15} /> {paying ? 'Abriendo el pago…' : `Comprar Exposiciones — ${priceTxt} · ${daysTxt}`}
            </Button>
          </>
        )}
      </div>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  h1: { color: 'var(--text)', fontSize: 22, margin: 0, display: 'flex', alignItems: 'center', gap: 8 },
  tabs: { display: 'flex', gap: 8, marginBottom: 12 },
  tab: { flex: 1, maxWidth: 200, textAlign: 'center', border: '1px solid', borderRadius: 'var(--r-sm)', padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  card: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 24, maxWidth: 440, margin: '0 auto', textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  lockIcon: { width: 52, height: 52, borderRadius: 'var(--r-md)', backgroundColor: 'rgba(199,249,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  cardTitle: { color: 'var(--text)', fontSize: 18, margin: '0 0 6px' },
  cardText: { color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: '0 0 18px' },
  label: { display: 'block', textAlign: 'left', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, marginBottom: 6 },
  divider: { display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: 11, margin: '16px 0' },
  locked: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '34px 22px', maxWidth: 440, margin: '6px auto 0', textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  lockIconSm: { width: 48, height: 48, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' },
  lockedTitle: { color: 'var(--text)', fontSize: 17, margin: '0 0 6px' },
  lockedText: { color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: '0 auto 18px', maxWidth: 320 },
  lockedCta: { display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(199,249,76,0.4)', borderRadius: 'var(--r-sm)', padding: '10px 16px' },
};
