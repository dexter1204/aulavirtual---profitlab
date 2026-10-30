'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plot } from './Plot';
import { LwcCandles, type LwcCandle, type LwcPriceLine, type LwcOverlay } from './LwcCandles';
import {
  quantApi, quantPaths, QuantError,
  type AnalyzeData, type ChartData, type FlowData, type OiData,
  type HeatmapData, type DeltaSurfaceData, type NetDriftData, type VolDriftData, type VolSurfaceData,
  type VolumeProfileData, type LevelsChartData, type VolatilityDriftData,
} from '@/lib/quant';
import {
  QUANT_GROUPS, QUANT_DEFAULT_TICKER, resolveTicker, isFutures, tickerLabel,
} from '@/lib/quantUniverse';
import {
  gammaFigure, oiFigure, flowFigure, deltaSurfaceFigure,
  netDriftFigure, volDriftFigure, volSurfaceFigure, spectrumFigure,
  volatilityDriftFigure, type Figure,
} from './figures';
import { C, fmtPrice, fmtLevel, fmtBig, fmtPct, fmtInt, heatColor, fmtHeat, webglOK } from './theme';

type ViewKey = 'gamma' | 'chart' | 'gexheat' | 'spectrum' | 'oi' | 'flow' | 'dsurf' | 'drift' | 'voldrift' | 'levels' | 'vp' | 'vol';

// Etiqueta de cada vista.
const VIEW_LABELS: Record<ViewKey, string> = {
  gamma: 'Gamma & Flow', chart: 'Chart', gexheat: 'GEX Heatmap', spectrum: 'Espectro 3D',
  oi: 'OI / % OI', flow: 'Big Trades', dsurf: 'Delta Surface', drift: 'Net Drift',
  voldrift: 'Volatility Drift', levels: 'Niveles γ/Δ', vp: 'Volume Profile', vol: 'Volatilidad',
};

// Navegación por categorías (en vez de 12 pestañas en scroll).
const CATEGORIES: { key: string; label: string; views: ViewKey[] }[] = [
  { key: 'exp', label: 'Exposición', views: ['gamma', 'levels', 'gexheat', 'spectrum', 'dsurf'] },
  { key: 'flow', label: 'Flujo', views: ['flow', 'oi'] },
  { key: 'price', label: 'Precio', views: ['chart', 'vp'] },
  { key: 'vol', label: 'Volatilidad', views: ['vol', 'drift', 'voldrift'] },
];
const catOf = (v: ViewKey) => CATEGORIES.find((c) => c.views.includes(v))?.key || 'exp';

const TIMEFRAMES: string[] = ['1m', '5m', '15m', '1h', '1D'];
const PLOT_H = 'clamp(420px, 64vh, 620px)';

type Kpi = { k: string; v: string; s?: string; tone?: 'pos' | 'neg' };

export function QuantView() {
  const [pick, setPick] = useState(QUANT_DEFAULT_TICKER);
  const symbol = resolveTicker(pick);
  const [view, setView] = useState<ViewKey>('gamma');
  const [category, setCategory] = useState<string>(catOf('gamma'));
  // sub-estados
  const [timeframe, setTimeframe] = useState('5m');
  const [deltaKind, setDeltaKind] = useState<'call' | 'put'>('call');
  const [volMode, setVolMode] = useState<'drift' | 'surface'>('drift');
  const [oiMode, setOiMode] = useState<'oi' | 'pct'>('oi');
  const [heatMode, setHeatMode] = useState<'gex' | 'dex'>('gex');
  const [spectrumMode, setSpectrumMode] = useState<'gex' | 'dex'>('gex');
  const [regimeMode, setRegimeMode] = useState<'gex' | 'dex'>('gex');
  const [surf3d, setSurf3d] = useState(true);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // navegar a una vista ajustando la categoría activa
  const goView = (v: ViewKey) => { setView(v); setCategory(catOf(v)); };
  const pickCategory = (key: string) => {
    setCategory(key);
    const cat = CATEGORIES.find((c) => c.key === key)!;
    if (!cat.views.includes(view)) setView(cat.views[0]);
  };
  const subViews = CATEGORIES.find((c) => c.key === category)?.views ?? [];

  // path (y clave de recarga) según la vista + sub-estado que requiere refetch
  const path = useMemo(() => {
    switch (view) {
      case 'gamma': return quantPaths.analyze(symbol);
      case 'chart': return quantPaths.chart(symbol, timeframe);
      case 'gexheat': return quantPaths.gexHeatmap(symbol);
      case 'spectrum': return quantPaths.spectrum(symbol);
      case 'oi': return quantPaths.oi(symbol);
      case 'flow': return quantPaths.flow(symbol);
      case 'dsurf': return quantPaths.deltaSurface(symbol, deltaKind);
      case 'drift': return quantPaths.netDrift(symbol);
      case 'voldrift': return quantPaths.volatilityDrift(symbol);
      case 'vp': return quantPaths.volumeProfile(symbol);
      case 'levels': return quantPaths.levelsChart(symbol);
      case 'vol': return volMode === 'surface' ? quantPaths.volSurface(symbol) : quantPaths.volDrift(symbol);
    }
  }, [view, symbol, timeframe, deltaKind, volMode]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    quantApi<any>(path)
      .then((d) => { if (alive) { setData(d); setLoading(false); } })
      .catch((e: QuantError) => { if (alive) { setData(null); setError(e.message); setLoading(false); } });
    return () => { alive = false; };
  }, [path]);

  const use3d = surf3d && (typeof window !== 'undefined' ? webglOK() : false);

  // figura Plotly derivada de data + toggles de solo-render (vistas Plotly)
  const figure: Figure | null = useMemo(() => {
    if (!data) return null;
    switch (view) {
      case 'gamma': return gammaFigure(data as AnalyzeData);
      case 'spectrum': return spectrumFigure(data as HeatmapData, spectrumMode, use3d);
      case 'oi': return oiFigure(data as OiData, oiMode === 'pct');
      case 'flow': return flowFigure(data as FlowData);
      case 'dsurf': return deltaSurfaceFigure(data as DeltaSurfaceData, use3d);
      case 'drift': return netDriftFigure(data as NetDriftData);
      case 'voldrift': return volatilityDriftFigure(data as VolatilityDriftData);
      case 'vol': return volMode === 'surface'
        ? volSurfaceFigure(data as VolSurfaceData, use3d)
        : volDriftFigure(data as VolDriftData);
      default: return null;
    }
  }, [data, view, spectrumMode, oiMode, use3d, volMode]);

  // datos para las vistas lightweight-charts (chart / vp / levels)
  const lwc = useMemo(() => {
    if (!data) return null;
    if (view === 'chart') {
      const d = data as ChartData;
      const seen = new Set<number>();
      const candles: LwcCandle[] = (d.bars || [])
        .filter((b) => b.c != null)
        .map((b) => ({ time: Math.floor(new Date(b.t).getTime() / 1000), open: b.o, high: b.h, low: b.l, close: b.c }))
        .filter((c) => isFinite(c.time))
        .sort((a, b) => a.time - b.time)
        .filter((c) => { if (seen.has(c.time)) return false; seen.add(c.time); return true; });
      const L = d.levels || {};
      const lines: LwcPriceLine[] = ([
        [L.call_wall, '#26a69a', 'Call Wall'], [L.put_wall, '#ef5350', 'Put Wall'], [L.gamma_flip, '#a855f7', 'γ Flip'],
      ] as [number | undefined, string, string][]).filter(([p]) => p != null && isFinite(p!)).map(([p, color, title]) => ({ price: p!, color, title }));
      const gex = d.gex || [], strikes = d.strikes || [];
      const overlay: LwcOverlay = (ctx, { series, chart, width, height }) => {
        if (!gex.length || !strikes.length) return;
        const psW = chart.priceScale('right').width() || 0;
        const rightEdge = width - psW - 2;
        const maxBarW = Math.min(0.16 * (width - psW), 120);
        const maxAbs = Math.max.apply(null, gex.map((v) => Math.abs(v))) || 1;
        const step = strikes.length > 1 ? Math.abs(strikes[1] - strikes[0]) : 1;
        for (let i = 0; i < strikes.length; i++) {
          const yC = series.priceToCoordinate(strikes[i]); if (yC == null) continue;
          const yT = series.priceToCoordinate(strikes[i] + step / 2), yB = series.priceToCoordinate(strikes[i] - step / 2);
          const bh = (yT != null && yB != null) ? Math.max(2, Math.abs(yB - yT) - 1) : 4;
          const bw = (Math.abs(gex[i]) / maxAbs) * maxBarW;
          ctx.fillStyle = gex[i] >= 0 ? 'rgba(38,166,154,0.55)' : 'rgba(239,83,80,0.55)';
          ctx.fillRect(rightEdge - bw, yC - bh / 2, bw, bh);
        }
      };
      return { candles, lines, overlay, fitKey: `${d.ticker}:${timeframe}`, stats: null as string | null };
    }
    if (view === 'vp') {
      const d = data as VolumeProfileData;
      const candles = (d.candles || []) as LwcCandle[];
      const lines: LwcPriceLine[] = [
        { price: d.poc, color: '#f5c451', title: 'POC', solid: true },
        { price: d.vah, color: '#3b82f6', title: 'VAH' },
        { price: d.val, color: '#3b82f6', title: 'VAL' },
      ].filter((l) => l.price != null && isFinite(l.price));
      const price = d.price || [], volume = d.volume || [];
      const overlay: LwcOverlay = (ctx, { series, chart, width, height }) => {
        const psW = chart.priceScale('right').width() || 0;
        const rightEdge = width - psW - 2;
        const maxBarW = Math.min(0.42 * (width - psW), 320);
        const maxVol = Math.max.apply(null, volume) || 1;
        const step = price.length > 1 ? Math.abs(price[1] - price[0]) : 1;
        for (let i = 0; i < price.length; i++) {
          const yC = series.priceToCoordinate(price[i]); if (yC == null) continue;
          const yT = series.priceToCoordinate(price[i] + step / 2), yB = series.priceToCoordinate(price[i] - step / 2);
          const bh = (yT != null && yB != null) ? Math.max(1, Math.abs(yB - yT) - 1) : 3;
          const bw = (volume[i] / maxVol) * maxBarW;
          const inVA = price[i] >= d.val && price[i] <= d.vah;
          const isPOC = Math.abs(price[i] - d.poc) <= step / 2;
          ctx.fillStyle = isPOC ? 'rgba(245,196,81,0.88)' : (inVA ? 'rgba(59,130,246,0.45)' : 'rgba(130,145,165,0.28)');
          ctx.fillRect(rightEdge - bw, yC - bh / 2, bw, bh);
        }
      };
      const f = (x: number) => Number(x).toLocaleString('es', { maximumFractionDigits: 2 });
      const stats = `${d.ticker} · POC ${f(d.poc)} · Value Area ${f(d.val)}–${f(d.vah)} (70%) · rango ${f(d.low)}–${f(d.high)} · ${d.bins} niveles`;
      return { candles, lines, overlay, fitKey: d.ticker, stats };
    }
    if (view === 'levels') {
      const d = data as LevelsChartData;
      const candles = ((d.candles || []).filter((c) => c.close != null && isFinite(c.time))) as LwcCandle[];
      const L = d.levels || {};
      const defs: [number | undefined, string, string, boolean][] = [
        [L.call_wall, '#26a69a', 'Call Wall', true], [L.put_wall, '#ef5350', 'Put Wall', true],
        [L.gamma_flip, '#a855f7', 'γ Flip', true], [L.delta_wall, '#f59e0b', 'Δ Wall', true],
        [L.major_neg_delta, '#3b82f6', 'Δ− mayor', false], [L.max_pain, '#8b98a9', 'Max Pain', false],
      ];
      const lines: LwcPriceLine[] = defs.filter(([p]) => p != null && isFinite(p!)).map(([p, color, title, solid]) => ({ price: p!, color, title, solid }));
      const f = (x: any) => (x == null || !isFinite(x)) ? '—' : Number(x).toLocaleString('es', { maximumFractionDigits: 2 });
      const stats = `${d.ticker} · spot ${f(d.spot)} · Call Wall ${f(L.call_wall)} · Put Wall ${f(L.put_wall)} · γ Flip ${f(L.gamma_flip)} · Δ Wall ${f(L.delta_wall)}`;
      return { candles, lines, overlay: undefined as LwcOverlay | undefined, fitKey: d.ticker, stats };
    }
    return null;
  }, [data, view, timeframe]);

  const isSurfaceView = view === 'dsurf' || view === 'spectrum' || (view === 'vol' && volMode === 'surface');
  const isLwcView = view === 'chart' || view === 'vp' || view === 'levels';

  // KPIs (hero) derivados del data cargado de la vista actual.
  const kpis = useMemo<Kpi[]>(() => kpisFor(view, data, { volMode, timeframe }), [view, data, volMode, timeframe]);

  // controles por-vista (van en el encabezado del panel de la gráfica)
  const controls = (() => {
    const segs: React.ReactNode[] = [];
    if (view === 'chart') segs.push(<Seg key="tf" options={TIMEFRAMES.map((t) => [t, t])} value={timeframe} onChange={setTimeframe} />);
    if (view === 'spectrum') segs.push(<Seg key="sp" options={[['gex', 'GEX'], ['dex', 'DEX']]} value={spectrumMode} onChange={(v) => setSpectrumMode(v as any)} />);
    if (view === 'oi') segs.push(<Seg key="oi" options={[['oi', 'OI'], ['pct', '% OI']]} value={oiMode} onChange={(v) => setOiMode(v as any)} />);
    if (view === 'dsurf') segs.push(<Seg key="dk" options={[['call', 'Call'], ['put', 'Put']]} value={deltaKind} onChange={(v) => setDeltaKind(v as any)} />);
    if (view === 'vol') segs.push(<Seg key="vm" options={[['drift', 'Term'], ['surface', 'Surface']]} value={volMode} onChange={(v) => setVolMode(v as any)} />);
    if (isSurfaceView && webglOK()) segs.push(<Seg key="d3" options={[['3d', '3D'], ['2d', '2D']]} value={surf3d ? '3d' : '2d'} onChange={(v) => setSurf3d(v === '3d')} />);
    return segs.length ? <div style={s.panelControls}>{segs}</div> : null;
  })();

  const asofTxt = data?.asof ? `as of ${String(data.asof).slice(0, 16).replace('T', ' ')}` : 'Exposiciones de dealers';

  return (
    <div style={s.wrap}>
      {/* ── header fijo: ticker protagonista + navegación por categorías ── */}
      <div className="quant-header" style={s.header}>
        <TickerHero pick={pick} symbol={symbol} onPick={setPick} />
        <div className="quant-hscroll" style={s.cats}>
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => pickCategory(c.key)} className="pl-pressable"
              style={{ ...s.cat, ...(category === c.key ? s.catActive : null) }}>{c.label}</button>
          ))}
        </div>
        <div className="quant-hscroll" style={s.subs}>
          {subViews.map((v) => (
            <button key={v} onClick={() => goView(v)} className="pl-pressable"
              style={{ ...s.sub, ...(view === v ? s.subActive : null) }}>
              {view === v && <span style={{ color: 'var(--primary)' }}>● </span>}{VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* ── meta ── */}
      <div style={s.asof}><span style={s.liveDot} />{asofTxt} · {VIEW_LABELS[view]}</div>

      {/* ── KPIs hero ── */}
      {kpis.length > 0 && (
        <div className="quant-kpis">
          {kpis.map((x, i) => (
            <div key={i} style={s.kpi}>
              <div style={s.kpiK}>{x.k}</div>
              <div style={{ ...s.kpiV, color: x.tone === 'pos' ? C.green : x.tone === 'neg' ? C.red : 'var(--text)' }}>{x.v}</div>
              {x.s ? <div style={s.kpiS}>{x.s}</div> : null}
            </div>
          ))}
        </div>
      )}

      {/* ── cuerpo: gráfica + detalle ── */}
      {loading ? (
        <ChartPanel title={VIEW_LABELS[view]}>
          <div style={{ height: PLOT_H, display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>Cargando {symbol}…</div>
        </ChartPanel>
      ) : error ? (
        <ChartPanel title={VIEW_LABELS[view]}>
          <div style={{ padding: 24, color: C.red }}>No se pudieron cargar los datos de {symbol}: {error}</div>
        </ChartPanel>
      ) : view === 'gamma' && data ? (
        <>
          <ChartPanel title="Gamma & Delta Exposure">
            <div style={{ height: PLOT_H }}>{figure && <Plot {...figure} style={{ height: '100%' }} />}</div>
          </ChartPanel>
          <RegimePanel d={data as AnalyzeData} mode={regimeMode} onMode={setRegimeMode} />
        </>
      ) : view === 'gexheat' && data ? (
        <ChartPanel title="Gamma Exposure · Strike × Expiry" controls={controls} flush>
          <GexHeatTable d={data as HeatmapData} mode={heatMode} />
        </ChartPanel>
      ) : view === 'flow' && data ? (
        <ChartPanel title="Big Trades · $ nocional">
          <div style={{ height: PLOT_H }}>{figure && <Plot {...figure} style={{ height: '100%' }} />}</div>
        </ChartPanel>
      ) : isLwcView && lwc ? (
        <ChartPanel title={VIEW_LABELS[view]} controls={controls}>
          {lwc.stats && <div style={s.lwcStats}>{lwc.stats}</div>}
          <div style={{ height: PLOT_H }}>
            <LwcCandles key={view} candles={lwc.candles} priceLines={lwc.lines} overlay={lwc.overlay} fitKey={lwc.fitKey} style={{ height: '100%' }} />
          </div>
        </ChartPanel>
      ) : figure ? (
        <ChartPanel title={VIEW_LABELS[view]} controls={controls}>
          <div style={{ height: PLOT_H }}>
            <Plot key={view + (use3d ? '3d' : '2d')} {...figure} style={{ height: '100%' }} />
          </div>
        </ChartPanel>
      ) : null}
    </div>
  );
}

// ── Ticker héroe (pill con select nativo transparente superpuesto) ──────────
function TickerHero({ pick, symbol, onPick }: { pick: string; symbol: string; onPick: (v: string) => void }) {
  const fut = isFutures(pick);
  const big = fut ? pick : symbol;
  const badge = (fut ? pick : symbol).slice(0, 4);
  return (
    <div style={s.tkr}>
      <div style={s.tkrBadge}>{badge}</div>
      <div style={{ minWidth: 0 }}>
        <div style={s.tkrSym}>
          ProfitLab <span style={{ color: 'var(--primary)' }}>Quant</span>
        </div>
        <div style={s.tkrHint}>{fut ? `${pick} → ${symbol}` : symbol} · toca para cambiar</div>
      </div>
      <svg style={s.tkrChev} width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <select value={pick} onChange={(e) => onPick(e.target.value)} style={s.tkrSelect} aria-label="Ticker">
        {QUANT_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.syms.map((sym) => <option key={sym} value={sym}>{tickerLabel(sym)}</option>)}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

// ── Panel de gráfica (encabezado + controles + cuerpo) ──────────────────────
function ChartPanel({ title, controls, children, flush }: { title: string; controls?: React.ReactNode; children: React.ReactNode; flush?: boolean }) {
  return (
    <div style={s.panel}>
      <div style={s.panelHead}>
        <span style={s.panelTitle}>{title}</span>
        {controls}
      </div>
      <div style={flush ? s.panelBodyFlush : s.panelBody}>{children}</div>
    </div>
  );
}

// ── KPIs por vista (derivados del data real) ────────────────────────────────
function kpisFor(view: ViewKey, data: any, opts: { volMode: string; timeframe: string }): Kpi[] {
  if (!data) return [];
  const L = data.levels || {}, T = data.totals || {};
  const sum2d = (zz: any) => (zz || []).reduce((a: number, row: any[]) => a + (row || []).reduce((b: number, v: number) => b + (isFinite(v) ? v : 0), 0), 0);
  switch (view) {
    case 'gamma':
      return [
        { k: 'Spot', v: fmtPrice(data.spot) },
        { k: 'Call Wall', v: fmtLevel(L.call_wall), s: 'resistencia', tone: 'pos' },
        { k: 'Put Wall', v: fmtLevel(L.put_wall), s: 'soporte', tone: 'neg' },
        { k: 'γ Flip', v: fmtLevel(L.gamma_flip), s: 'pivote' },
        { k: 'Net GEX', v: fmtBig(T.gex), s: (T.gex ?? 0) >= 0 ? 'net long' : 'net short', tone: (T.gex ?? 0) >= 0 ? 'pos' : 'neg' },
        { k: 'Net DEX', v: fmtBig(T.dex), s: (T.dex ?? 0) >= 0 ? 'net long' : 'net short', tone: (T.dex ?? 0) >= 0 ? 'pos' : 'neg' },
      ];
    case 'levels':
      return [
        { k: 'Spot', v: fmtPrice(data.spot) },
        { k: 'Call Wall', v: fmtLevel(L.call_wall), tone: 'pos' },
        { k: 'Put Wall', v: fmtLevel(L.put_wall), tone: 'neg' },
        { k: 'γ Flip', v: fmtLevel(L.gamma_flip) },
        { k: 'Δ Wall', v: fmtLevel(L.delta_wall), tone: 'pos' },
        { k: 'Max Pain', v: fmtLevel(L.max_pain) },
      ];
    case 'gexheat':
    case 'spectrum': {
      const ng = sum2d(data.z_gex), nd = sum2d(data.z_dex);
      return [
        { k: 'Spot', v: fmtPrice(data.spot) },
        { k: 'Net GEX', v: fmtBig(ng), s: ng >= 0 ? 'net long' : 'net short', tone: ng >= 0 ? 'pos' : 'neg' },
        { k: 'Net DEX', v: fmtBig(nd), s: nd >= 0 ? 'net long' : 'net short', tone: nd >= 0 ? 'pos' : 'neg' },
        { k: 'Vencimientos', v: String((data.dte || data.expiries || []).length) },
      ];
    }
    case 'oi': {
      const cOI = (data.call_oi || []).reduce((a: number, b: number) => a + (b || 0), 0);
      const pOI = (data.put_oi || []).reduce((a: number, b: number) => a + (b || 0), 0);
      return [
        { k: 'Spot', v: fmtPrice(data.spot) },
        { k: 'Call OI', v: fmtInt(cOI), tone: 'pos' },
        { k: 'Put OI', v: fmtInt(pOI), tone: 'neg' },
        { k: 'Put/Call', v: (cOI ? pOI / cOI : 0).toFixed(2), s: pOI >= cOI ? 'put heavy' : 'call heavy' },
      ];
    }
    case 'flow': {
      const callHeavy = (T.call_notional || 0) >= (T.put_notional || 0);
      return [
        { k: 'Call $ hoy', v: fmtBig(T.call_notional), s: 'flujo', tone: 'pos' },
        { k: 'Put $ hoy', v: fmtBig(T.put_notional), s: 'flujo', tone: 'neg' },
        { k: 'Sesgo', v: callHeavy ? 'CALL' : 'PUT', s: 'del flujo $', tone: callHeavy ? 'pos' : 'neg' },
        { k: 'Nivel top', v: T.top_strike != null ? `$${fmtLevel(T.top_strike)}` : '—', s: 'más $ hoy' },
      ];
    }
    case 'chart':
      return [
        { k: 'Spot', v: fmtPrice(data.spot) },
        { k: 'Call Wall', v: fmtLevel(L.call_wall), tone: 'pos' },
        { k: 'Put Wall', v: fmtLevel(L.put_wall), tone: 'neg' },
        { k: 'γ Flip', v: fmtLevel(L.gamma_flip) },
        { k: 'Marco', v: opts.timeframe },
      ];
    case 'vp':
      return [
        { k: 'POC', v: fmtPrice(data.poc), s: 'pico volumen' },
        { k: 'VAH', v: fmtPrice(data.vah), tone: 'pos' },
        { k: 'VAL', v: fmtPrice(data.val), tone: 'neg' },
        { k: 'Rango', v: fmtLevel((data.high ?? 0) - (data.low ?? 0)) },
        { k: 'Niveles', v: String(data.bins ?? '') },
      ];
    case 'dsurf':
      return [
        { k: 'Spot', v: fmtPrice(data.spot) },
        { k: 'Tipo', v: data.kind === 'put' ? 'PUT Δ' : 'CALL Δ', tone: data.kind === 'put' ? 'neg' : 'pos' },
        { k: 'IV ATM', v: data.iv != null ? fmtPct(data.iv) : '—' },
      ];
    case 'drift':
      return [
        { k: 'Call drift', v: fmtBig(T.call_drift), tone: 'pos' },
        { k: 'Put drift', v: fmtBig(T.put_drift), tone: 'neg' },
        { k: 'Último', v: fmtPrice(T.last) },
      ];
    case 'voldrift': {
      const arv = data.arv || [], last = arv.length ? arv[arv.length - 1] : null;
      const px = data.price || [], lp = px.length ? px[px.length - 1] : null;
      const f = (x: any) => (x == null || !isFinite(x)) ? '—' : `${x.toFixed(1)}%`;
      return [
        { k: `ARV ${data.window || 20}d`, v: f(last) },
        { k: 'IV ATM', v: f(data.iv) },
        { k: 'Último', v: fmtPrice(lp) },
      ];
    }
    case 'vol': {
      if (opts.volMode === 'surface') {
        return [
          { k: 'Spot', v: fmtPrice(data.spot) },
          { k: 'Strikes', v: String((data.strikes || []).length) },
          { k: 'Vencimientos', v: String((data.dte || data.expiries || []).length) },
        ];
      }
      const atm = data.atm_iv || [];
      const f = (x: any) => (x == null || !isFinite(x)) ? '—' : `${(x * 100).toFixed(1)}%`;
      return [
        { k: 'ATM IV (cerca)', v: f(atm[0]) },
        { k: 'ATM IV (lejos)', v: f(atm[atm.length - 1]) },
        { k: 'Puntos', v: String((data.dte || []).length) },
      ];
    }
    default: return [];
  }
}

// ── segmented control ──────────────────────────────────────────────────────
function Seg({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={s.seg}>
      {options.map(([val, label]) => (
        <button key={val} onClick={() => onChange(val)} className="pl-pressable"
          style={{ ...s.segBtn, ...(value === val ? s.segBtnActive : null) }}>{label}</button>
      ))}
    </div>
  );
}

// ── Regime panel (régimen + ranking por nivel) ──────────────────────────────
function RegimePanel({ d, mode, onMode }: { d: AnalyzeData; mode: 'gex' | 'dex'; onMode: (m: 'gex' | 'dex') => void }) {
  const T = d.totals || {};
  const strikes = (mode === 'dex' ? d.dex_strikes : d.strikes) || [];
  const vals = (mode === 'dex' ? d.dex : d.gex) || [];
  const net = (mode === 'dex' ? T.dex : T.gex) ?? 0;
  const pairs = strikes.map((k, i) => ({ k: Number(k), v: Number(vals[i]) || 0 })).filter((p) => isFinite(p.k));
  let grossPos = 0, grossNeg = 0;
  pairs.forEach((p) => { if (p.v >= 0) grossPos += p.v; else grossNeg += -p.v; });
  const gross = grossPos + grossNeg || 1;
  const callPct = grossPos / gross, putPct = grossNeg / gross;
  const putHeavy = grossNeg >= grossPos;
  const biasPct = Math.round((putHeavy ? putPct : callPct) * 100);
  const callZone = pairs.filter((p) => p.v > 0).sort((a, b) => b.v - a.v)[0];
  const putZone = pairs.filter((p) => p.v < 0).sort((a, b) => a.v - b.v)[0];
  const ranked = pairs.slice().sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const major = ranked[0];
  const maxAbs = ranked.length ? Math.abs(ranked[0].v) || 1 : 1;
  const M = mode.toUpperCase();

  const Tile = ({ t, v, ss, pos, wide }: { t: string; v: string; ss: string; pos?: boolean; wide?: boolean }) => (
    <div style={{ ...s.rpTile, ...(wide ? { gridColumn: '1 / -1' } : null) }}>
      <span style={s.rpT}>{t}</span>
      <span style={{ ...s.rpV, color: pos === undefined ? C.text : pos ? C.green : C.red }}>{v}</span>
      <span style={s.rpSS}>{ss}</span>
    </div>
  );

  return (
    <div style={s.regimePanel}>
      <div style={s.panelHead}>
        <span style={s.panelTitle}>Régimen · ranking</span>
        <div style={s.panelControls}><Seg options={[['gex', 'GEX'], ['dex', 'DEX']]} value={mode} onChange={(v) => onMode(v as any)} /></div>
      </div>
      <div style={s.rpTiles}>
        <Tile t={`Net ${M}`} v={fmtBig(net)} ss={net >= 0 ? 'net long' : 'net short'} pos={net >= 0} />
        <Tile t={mode === 'dex' ? 'Pos Zone' : 'Call Zone'} v={callZone ? '$' + fmtLevel(callZone.k) : '—'} ss={callZone ? fmtBig(callZone.v) : '—'} />
        <Tile t={mode === 'dex' ? 'Neg Zone' : 'Put Zone'} v={putZone ? '$' + fmtLevel(putZone.k) : '—'} ss={putZone ? fmtBig(putZone.v) : '—'} />
        <Tile t="Bias" v={putHeavy ? 'PUT HEAVY' : 'CALL HEAVY'} ss={`${biasPct}% of gross exp.`} pos={!putHeavy} />
        <Tile t="Major Zone" v={major ? '$' + fmtLevel(major.k) : '—'} ss={major ? fmtBig(major.v) + ' abs. exposure' : '—'} pos={major ? major.v >= 0 : undefined} wide />
      </div>
      <div style={s.rpSplit}>
        <div style={{ ...s.rpSplitPut, width: `${(putPct * 100).toFixed(1)}%` }}>PUT {Math.round(putPct * 100)}%</div>
        <div style={s.rpSplitCall}>CALL {Math.round(callPct * 100)}%</div>
      </div>
      <div style={s.rpRank}>
        {ranked.slice(0, 14).map((p, i) => {
          const pos = p.v >= 0;
          const w = Math.max(3, (Math.abs(p.v) / maxAbs) * 100);
          return (
            <div key={i} style={s.rpRow}>
              <span style={s.rpK}>${fmtLevel(p.k)}</span>
              <span style={s.rpTrack}><span style={{ ...s.rpFill, width: `${w.toFixed(1)}%`, background: pos ? C.green : C.red }} /></span>
              <span style={{ ...s.rpAmt, color: pos ? C.green : C.red }}>{fmtBig(p.v)}</span>
            </div>
          );
        })}
      </div>
      <div style={s.rpFoot}>Current chain snapshot · ranked by absolute {M}</div>
    </div>
  );
}

// ── GEX/DEX heatmap table ───────────────────────────────────────────────────
function GexHeatTable({ d, mode }: { d: HeatmapData; mode: 'gex' | 'dex' }) {
  const strikes = d.strikes || [];
  const Z = (mode === 'dex' ? d.z_dex : d.z_gex) || d.z || [];
  const labels = (d.dte && d.dte.length) ? d.dte.map((x) => `${x}D`) : (d.expiries || []).map((e) => (e || '').slice(5));
  let amax = 1;
  for (const row of Z) for (const v of (row || [])) if (v != null && isFinite(v)) amax = Math.max(amax, Math.abs(v));
  let spotIdx = -1, best = Infinity;
  strikes.forEach((st, i) => { const g = Math.abs(st - (d.spot || 0)); if (g < best) { best = g; spotIdx = i; } });
  const order = strikes.map((_, i) => i).sort((a, b) => strikes[b] - strikes[a]);
  return (
    <>
      <div style={{ overflow: 'auto', maxHeight: PLOT_H }} className="quant-hscroll">
        <table style={s.heatTable}>
          <thead>
            <tr>
              <th style={{ ...s.heatTh, ...s.heatSk }}>STRIKE</th>
              {labels.map((l, j) => <th key={j} style={s.heatTh}>{l}</th>)}
            </tr>
          </thead>
          <tbody>
            {order.map((i) => {
              const spot = i === spotIdx;
              return (
                <tr key={i} style={spot ? { outline: `1px solid ${C.cyan}` } : undefined}>
                  <th style={{ ...s.heatSk, textAlign: 'right' }}>
                    ${fmtLevel(strikes[i])}{spot && <i style={{ color: C.cyan, fontStyle: 'normal', fontSize: 9, marginLeft: 4 }}>SPOT</i>}
                  </th>
                  {(Z[i] || []).map((v, j) => (
                    <td key={j} style={{ ...s.heatTd, background: heatColor(v, amax) }}>{fmtHeat(v)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={s.scrollHint}>← desliza para ver más vencimientos →</div>
    </>
  );
}

// ── estilos (gama del Aula) ─────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column' },
  // header sticky
  header: { position: 'sticky', top: 'env(safe-area-inset-top, 0px)', zIndex: 20, background: 'var(--bg)',
    borderBottom: '1px solid var(--border)', padding: '8px 0 10px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 9 },
  // ticker héroe
  tkr: { position: 'relative', display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '9px 12px' },
  tkrBadge: { width: 38, height: 38, flex: 'none', borderRadius: 11, display: 'grid', placeItems: 'center',
    fontFamily: 'var(--font-bricolage), sans-serif', fontWeight: 800, fontSize: 13, color: '#07080B', background: 'var(--primary)' },
  tkrSym: { fontFamily: 'var(--font-bricolage), sans-serif', fontWeight: 800, fontSize: 17, letterSpacing: '-.01em', color: 'var(--text)', lineHeight: 1.1 },
  tkrHint: { fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },
  tkrChev: { marginLeft: 'auto', color: 'var(--text-dim)', flex: 'none' },
  tkrSelect: { position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 16, border: 'none', appearance: 'none', WebkitAppearance: 'none' } as React.CSSProperties,
  // nav
  cats: { display: 'flex', gap: 7, paddingBottom: 2 },
  cat: { flex: 'none', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)',
    borderRadius: 'var(--r-pill)', padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  catActive: { background: 'var(--primary)', color: '#07080B', borderColor: 'var(--primary)' },
  subs: { display: 'flex', gap: 7, paddingBottom: 2 },
  sub: { flex: 'none', border: 'none', background: 'var(--surface-hi)', color: 'var(--text-muted)',
    borderRadius: 'var(--r-pill)', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  subActive: { color: 'var(--text)', background: '#2A2F3A', boxShadow: 'inset 0 0 0 1px var(--border)' },
  // meta
  asof: { display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-dim)', fontSize: 11, margin: '0 2px 10px', fontFamily: 'ui-monospace, monospace' },
  liveDot: { width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: '0 0 0 3px rgba(34,197,94,.18)' },
  // KPI
  kpi: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 13px', minWidth: 0 },
  kpiK: { color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  kpiV: { fontFamily: 'ui-monospace, monospace', fontWeight: 700, fontSize: 20, marginTop: 5, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' },
  kpiS: { fontSize: 11, fontWeight: 600, marginTop: 2, color: 'var(--text-muted)' },
  // panel
  panel: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginTop: 14, overflow: 'hidden' },
  panelHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 13px 3px' },
  panelTitle: { fontFamily: 'var(--font-bricolage), sans-serif', fontWeight: 800, fontSize: 13.5, color: 'var(--text)' },
  panelControls: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  panelBody: { padding: '6px 10px 10px' },
  panelBodyFlush: { padding: 0 },
  lwcStats: { color: 'var(--text-muted)', fontSize: 12, fontFamily: 'ui-monospace, monospace', padding: '2px 4px 6px' },
  // segmented
  seg: { display: 'inline-flex', backgroundColor: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' },
  segBtn: { background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '5px 11px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  segBtnActive: { backgroundColor: 'var(--primary)', color: '#07080B' },
  // regime panel
  regimePanel: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 14 },
  rpTiles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 13px' },
  rpTile: { backgroundColor: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 1 },
  rpT: { color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' },
  rpV: { fontSize: 16, fontWeight: 800, fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' },
  rpSS: { color: 'var(--text-muted)', fontSize: 10.5 },
  rpSplit: { display: 'flex', height: 24, borderRadius: 'var(--r-sm)', overflow: 'hidden', fontSize: 10.5, fontWeight: 800, margin: '0 13px', fontFamily: 'ui-monospace, monospace' },
  rpSplitPut: { backgroundColor: 'rgba(239,68,68,.9)', color: '#fff', display: 'flex', alignItems: 'center', paddingLeft: 10, minWidth: 44 },
  rpSplitCall: { backgroundColor: 'rgba(34,197,94,.9)', color: '#06240f', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, flex: 1 },
  rpRank: { display: 'flex', flexDirection: 'column', gap: 6, padding: '0 13px' },
  rpRow: { display: 'grid', gridTemplateColumns: '58px 1fr 72px', alignItems: 'center', gap: 9 },
  rpK: { color: 'var(--text-muted)', fontSize: 11.5, fontFamily: 'ui-monospace, monospace' },
  rpTrack: { background: 'var(--surface-hi)', borderRadius: 4, height: 9, overflow: 'hidden' },
  rpFill: { display: 'block', height: '100%', borderRadius: 4 },
  rpAmt: { fontSize: 11.5, fontWeight: 700, textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' },
  rpFoot: { color: 'var(--text-dim)', fontSize: 10.5, padding: '0 13px' },
  // heatmap table
  heatTable: { borderCollapse: 'collapse', width: '100%', fontFamily: 'ui-monospace, monospace' },
  heatTh: { position: 'sticky', top: 0, background: 'var(--surface)', color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, padding: '7px 9px', whiteSpace: 'nowrap', zIndex: 1 },
  heatSk: { background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, padding: '6px 10px', whiteSpace: 'nowrap', position: 'sticky', left: 0 },
  heatTd: { color: 'var(--text)', fontSize: 10.5, padding: '6px 9px', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' },
  scrollHint: { color: 'var(--text-dim)', fontSize: 10.5, textAlign: 'center', padding: '8px', fontFamily: 'ui-monospace, monospace' },
};
