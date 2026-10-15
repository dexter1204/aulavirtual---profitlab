'use client';

import { useMemo, useState } from 'react';
import { SignalsTabs } from '@/components/SignalsTabs';
import { inputStyle } from '@/components/ui';

type Cat = 'oro' | 'indices' | 'forex' | 'cripto';
type Instrument = { symbol: string; name: string; category: Cat; contractSize: number; pipDecimal: number };

const INSTRUMENTS: Instrument[] = [
  { symbol: 'XAUUSD', name: 'Oro', category: 'oro', contractSize: 100, pipDecimal: 1 },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'indices', contractSize: 1, pipDecimal: 0 },
  { symbol: 'US30', name: 'Dow Jones', category: 'indices', contractSize: 1, pipDecimal: 0 },
  { symbol: 'SPX500', name: 'S&P 500', category: 'indices', contractSize: 1, pipDecimal: 0 },
  { symbol: 'EURUSD', name: 'Euro / Dólar', category: 'forex', contractSize: 100000, pipDecimal: 4 },
  { symbol: 'GBPUSD', name: 'Libra / Dólar', category: 'forex', contractSize: 100000, pipDecimal: 4 },
  { symbol: 'AUDUSD', name: 'Aussie / Dólar', category: 'forex', contractSize: 100000, pipDecimal: 4 },
  { symbol: 'NZDUSD', name: 'Kiwi / Dólar', category: 'forex', contractSize: 100000, pipDecimal: 4 },
  { symbol: 'USDCAD', name: 'Dólar / Loonie', category: 'forex', contractSize: 100000, pipDecimal: 4 },
  { symbol: 'USDCHF', name: 'Dólar / Franco', category: 'forex', contractSize: 100000, pipDecimal: 4 },
  { symbol: 'USDJPY', name: 'Dólar / Yen', category: 'forex', contractSize: 100000, pipDecimal: 2 },
  { symbol: 'BTCUSD', name: 'Bitcoin', category: 'cripto', contractSize: 1, pipDecimal: 0 },
  { symbol: 'ETHUSD', name: 'Ethereum', category: 'cripto', contractSize: 1, pipDecimal: 0 },
];
const CATS: [Cat, string][] = [['oro', '🥇 Oro'], ['indices', '📈 Índices'], ['forex', '💱 Forex'], ['cripto', '₿ Cripto']];

export default function CalculadoraPage() {
  const [cat, setCat] = useState<Cat>('oro');
  const [symbol, setSymbol] = useState('XAUUSD');
  const [capital, setCapital] = useState('10000');
  const [leverage, setLeverage] = useState(200);
  const [mode, setMode] = useState<'pct' | 'usd'>('pct');
  const [pct, setPct] = useState('1');
  const [riskUsd, setRiskUsd] = useState('100');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');

  const list = INSTRUMENTS.filter((i) => i.category === cat);
  const inst = INSTRUMENTS.find((i) => i.symbol === symbol) ?? list[0];

  const res = useMemo(() => {
    const cap = parseFloat(capital), e = parseFloat(entry), s = parseFloat(sl);
    if (!inst || isNaN(cap) || isNaN(e) || isNaN(s) || e === s) return null;
    const riskAmount = mode === 'pct' ? cap * (parseFloat(pct) || 0) / 100 : (parseFloat(riskUsd) || 0);
    const priceDistance = Math.abs(e - s);
    const pipMultiplier = Math.pow(10, inst.pipDecimal);
    const pipsRisk = priceDistance * pipMultiplier;
    let lote = inst.symbol === 'USDJPY'
      ? (riskAmount * e) / (priceDistance * inst.contractSize)
      : riskAmount / (priceDistance * inst.contractSize);
    lote = Math.max(0.01, Math.floor(lote * 100) / 100);
    const marginRequired = (lote * inst.contractSize * e) / leverage;
    const pipValue = pipsRisk ? riskAmount / pipsRisk : 0;
    const warnings: string[] = [];
    if (marginRequired > cap) warnings.push('El margen requerido supera tu capital.');
    if (lote > 10) warnings.push('Lote muy grande (>10). Revisa tu SL.');
    if (mode === 'pct' && parseFloat(pct) > 5) warnings.push('Estás arriesgando más de 5% del capital.');
    return { riskAmount, pipsRisk, lote, marginRequired, pipValue, warnings };
  }, [capital, entry, sl, mode, pct, riskUsd, leverage, inst]);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 12px 100px' }}>
      <SignalsTabs />
      <h1 style={styles.h1}>Calculadora de lotaje</h1>
      <p style={styles.sub}>Tamaño de posición según tu riesgo. Herramienta de gestión.</p>

      <L label="Categoría"><div style={styles.toggle}>{CATS.map(([c, label]) => <button key={c} type="button" onClick={() => { setCat(c); const f = INSTRUMENTS.find((i) => i.category === c); if (f) setSymbol(f.symbol); }} style={{ ...styles.tbtn, backgroundColor: cat === c ? '#C7F94C' : 'transparent', color: cat === c ? '#0A0B0E' : '#94A3B8', fontWeight: cat === c ? 700 : 500 }}>{label}</button>)}</div></L>
      <L label="Instrumento"><select value={symbol} onChange={(e) => setSymbol(e.target.value)} style={inputStyle}>{list.map((i) => <option key={i.symbol} value={i.symbol}>{i.symbol} · {i.name}</option>)}</select></L>
      <div style={styles.grid2}>
        <L label="Capital (USD)"><input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} style={inputStyle} /></L>
        <L label="Apalancamiento"><div style={styles.toggle}>{[100, 200, 500].map((l) => <button key={l} type="button" onClick={() => setLeverage(l)} style={{ ...styles.tbtn, backgroundColor: leverage === l ? '#C7F94C' : 'transparent', color: leverage === l ? '#0A0B0E' : '#94A3B8', fontWeight: leverage === l ? 700 : 500 }}>1:{l}</button>)}</div></L>
      </div>
      <L label="Modo de riesgo"><div style={styles.toggle}>{([['pct', '% del capital'], ['usd', 'USD fijo']] as [typeof mode, string][]).map(([m, label]) => <button key={m} type="button" onClick={() => setMode(m)} style={{ ...styles.tbtn, backgroundColor: mode === m ? '#C7F94C' : 'transparent', color: mode === m ? '#0A0B0E' : '#94A3B8', fontWeight: mode === m ? 700 : 500 }}>{label}</button>)}</div></L>
      {mode === 'pct' ? (
        <L label="% de riesgo"><div style={{ display: 'flex', gap: 6 }}>{['0.5', '1', '2', '3'].map((v) => <button key={v} type="button" onClick={() => setPct(v)} style={{ ...styles.quick, borderColor: pct === v ? '#C7F94C' : '#1F222B', color: pct === v ? '#C7F94C' : '#94A3B8' }}>{v}%</button>)}<input type="number" step="any" value={pct} onChange={(e) => setPct(e.target.value)} style={{ ...inputStyle, flex: 1 }} /></div></L>
      ) : (
        <L label="USD a arriesgar"><input type="number" step="any" value={riskUsd} onChange={(e) => setRiskUsd(e.target.value)} style={inputStyle} /></L>
      )}
      <div style={styles.grid2}>
        <L label="Entry"><input type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} style={inputStyle} /></L>
        <L label="Stop loss"><input type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} style={{ ...inputStyle, color: '#f87171' }} /></L>
      </div>

      {res ? (
        <div style={styles.result}>
          <div style={{ color: '#64748B', fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>Lote recomendado</div>
          <div style={styles.lote}>{res.lote.toFixed(2)}</div>
          <div style={styles.resGrid}>
            <RB label="Pips de SL" value={res.pipsRisk.toFixed(1)} />
            <RB label="Riesgo USD" value={`$${res.riskAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} color="#f87171" />
            <RB label="Valor por pip" value={`$${res.pipValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
            <RB label="Margen requerido" value={`$${res.marginRequired.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} color="#FCD34D" />
          </div>
          {res.warnings.map((w, i) => <div key={i} style={styles.warn}>⚠️ {w}</div>)}
        </div>
      ) : (
        <div style={styles.placeholder}>🧮 Completa capital, entry y stop loss para calcular tu lote.</div>
      )}
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ marginBottom: 12 }}><label style={styles.lbl}>{label}</label>{children}</div>; }
function RB({ label, value, color = '#F1F5F9' }: { label: string; value: string; color?: string }) {
  return <div style={styles.rb}><div style={{ color: '#64748B', fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</div><div style={{ color, fontSize: 15, fontWeight: 700, fontFamily: 'ui-monospace, monospace', marginTop: 3 }}>{value}</div></div>;
}

const styles: Record<string, React.CSSProperties> = {
  h1: { color: '#F1F5F9', fontSize: 22, fontWeight: 800, margin: 0, fontFamily: 'var(--font-bricolage), sans-serif', letterSpacing: -0.4 },
  sub: { color: '#94A3B8', fontSize: 13, margin: '4px 0 16px' },
  lbl: { display: 'block', color: '#94A3B8', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  toggle: { display: 'flex', gap: 4, background: '#14161C', border: '1px solid #1F222B', borderRadius: 10, padding: 3 },
  tbtn: { flex: 1, border: 0, borderRadius: 8, padding: '9px 6px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', minHeight: 40 },
  quick: { background: '#14161C', border: '1px solid', borderRadius: 8, padding: '0 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44 },
  result: { background: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 18, marginTop: 6, textAlign: 'center' },
  lote: { color: '#C7F94C', fontSize: 44, fontWeight: 800, fontFamily: 'ui-monospace, monospace', margin: '4px 0 14px', textShadow: '0 0 20px rgba(199,249,76,.3)' },
  resGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  rb: { background: '#0A0B0E', border: '1px solid #1F222B', borderRadius: 10, padding: '9px 11px', textAlign: 'left' },
  warn: { background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.3)', color: '#FCD34D', fontSize: 12.5, borderRadius: 10, padding: '9px 12px', marginTop: 10, textAlign: 'left' },
  placeholder: { background: '#14161C', border: '1px dashed #1F222B', borderRadius: 14, padding: 28, textAlign: 'center', color: '#64748B', fontSize: 14, marginTop: 6 },
};
