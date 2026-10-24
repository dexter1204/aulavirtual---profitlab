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
import { C, fmtPrice, fmtLevel, fmtBig, heatColor, fmtHeat, webglOK } from './theme';

type ViewKey = 'gamma' | 'chart' | 'gexheat' | 'spectrum' | 'oi' | 'flow' | 'dsurf' | 'drift' | 'voldrift' | 'levels' | 'vp' | 'vol';
const TABS: { key: ViewKey; label: string }[] = [
  { key: 'gamma', label: 'Gamma & Flow' },
  { key: 'chart', label: 'Chart' },
  { key: 'gexheat', label: 'GEX Heatmap' },
  { key: 'spectrum', label: 'Espectro 3D' },
  { key: 'oi', label: 'OI / % OI' },
  { key: 'flow', label: 'Big Trades' },
  { key: 'dsurf', label: 'Delta Surface' },
  { key: 'drift', label: 'Net Drift' },
  { key: 'voldrift', label: 'Volatility Drift' },
  { key: 'levels', label: 'Niveles γ/Δ' },
  { key: 'vp', label: 'Volume Profile' },
  { key: 'vol', label: 'Volatilidad' },
];
const TIMEFRAMES: string[] = ['1m', '5m', '15m', '1h', '1D'];
const PLOT_H = 'clamp(420px, 66vh, 640px)';

export function QuantView() {
  const [pick, setPick] = useState(QUANT_DEFAULT_TICKER);
  const symbol = resolveTicker(pick);
  const [view, setView] = useState<ViewKey>('gamma');
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

  return (
    <div style={s.wrap}>
      {/* barra superior: ticker + tabs */}
      <div style={s.topbar}>
        <div style={s.brand}>ProfitLab <span style={{ color: C.lime }}>Quant</span></div>
        <select value={pick} onChange={(e) => setPick(e.target.value)} style={s.select} aria-label="Ticker">
          {QUANT_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.syms.map((sym) => <option key={sym} value={sym}>{tickerLabel(sym)}</option>)}
            </optgroup>
          ))}
        </select>
        <span style={s.symName}>{isFutures(pick) ? `${pick} → ${symbol}` : symbol}</span>
      </div>

      <div style={s.tabs}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setView(t.key)} className="pl-pressable"
            style={{ ...s.tab, ...(view === t.key ? s.tabActive : null) }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* controles por-vista */}
      <div style={s.controls}>
        {view === 'chart' && (
          <Seg options={TIMEFRAMES.map((t) => [t, t])} value={timeframe} onChange={(v) => setTimeframe(v)} />
        )}
        {view === 'gexheat' && (
          <Seg options={[['gex', 'GEX'], ['dex', 'DEX']]} value={heatMode} onChange={(v) => setHeatMode(v as any)} />
        )}
        {view === 'spectrum' && (
          <Seg options={[['gex', 'GEX'], ['dex', 'DEX']]} value={spectrumMode} onChange={(v) => setSpectrumMode(v as any)} />
        )}
        {view === 'oi' && (
          <Seg options={[['oi', 'OI'], ['pct', '% OI']]} value={oiMode} onChange={(v) => setOiMode(v as any)} />
        )}
        {view === 'dsurf' && (
          <Seg options={[['call', 'Call'], ['put', 'Put']]} value={deltaKind} onChange={(v) => setDeltaKind(v as any)} />
        )}
        {view === 'vol' && (
          <Seg options={[['drift', 'Term'], ['surface', 'Surface']]} value={volMode} onChange={(v) => setVolMode(v as any)} />
        )}
        {isSurfaceView && webglOK() && (
          <Seg options={[['3d', '3D'], ['2d', '2D']]} value={surf3d ? '3d' : '2d'} onChange={(v) => setSurf3d(v === '3d')} />
        )}
      </div>

      {/* gamma: ribbon de niveles */}
      {view === 'gamma' && data && <Ribbon d={data as AnalyzeData} />}

      {/* cuerpo */}
      {loading ? (
        <div style={{ ...s.panelBox, height: PLOT_H, display: 'grid', placeItems: 'center', color: C.muted }}>
          Cargando {symbol}…
        </div>
      ) : error ? (
        <div style={{ ...s.panelBox, padding: 24, color: C.red }}>No se pudieron cargar los datos de {symbol}: {error}</div>
      ) : view === 'gamma' && data ? (
        <div className="quant-gamma-grid">
          <div style={{ ...s.panelBox, height: PLOT_H }}>{figure && <Plot {...figure} style={{ height: '100%' }} />}</div>
          <RegimePanel d={data as AnalyzeData} mode={regimeMode} onMode={setRegimeMode} />
        </div>
      ) : view === 'gexheat' && data ? (
        <GexHeatTable d={data as HeatmapData} mode={heatMode} />
      ) : view === 'flow' && data ? (
        <>
          <FlowRibbon d={data as FlowData} />
          <div style={{ ...s.panelBox, height: PLOT_H }}>{figure && <Plot {...figure} style={{ height: '100%' }} />}</div>
        </>
      ) : isLwcView && lwc ? (
        <>
          {lwc.stats && <div style={s.lwcStats}>{lwc.stats}</div>}
          <div style={{ ...s.panelBox, height: PLOT_H }}>
            <LwcCandles key={view} candles={lwc.candles} priceLines={lwc.lines} overlay={lwc.overlay} fitKey={lwc.fitKey} style={{ height: '100%' }} />
          </div>
        </>
      ) : figure ? (
        <div style={{ ...s.panelBox, height: PLOT_H }}>
          <Plot key={view + (use3d ? '3d' : '2d')} {...figure} style={{ height: '100%' }} />
        </div>
      ) : null}
    </div>
  );
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

// ── Gamma ribbon ────────────────────────────────────────────────────────────
function Ribbon({ d }: { d: AnalyzeData }) {
  const L = d.levels || {}, T = d.totals || {};
  const cells = [
    { lbl: 'Spot', v: fmtPrice(d.spot), s: `as of ${(d.asof || '').slice(0, 10)}`, sc: C.muted },
    { lbl: 'Call Wall', v: fmtLevel(L.call_wall), s: 'resistance', sc: C.green },
    { lbl: 'Put Wall', v: fmtLevel(L.put_wall), s: 'support', sc: C.red },
    { lbl: 'Gamma Flip', v: fmtLevel(L.gamma_flip), s: 'regime pivot', sc: C.muted },
    { lbl: 'Max Pain', v: fmtLevel(L.max_pain), s: 'pin target', sc: C.muted },
    { lbl: 'Total GEX', v: fmtBig(T.gex), s: (T.gex ?? 0) >= 0 ? 'net long' : 'net short', sc: (T.gex ?? 0) >= 0 ? C.green : C.red },
    { lbl: 'Total DEX', v: fmtBig(T.dex), s: (T.dex ?? 0) >= 0 ? 'net long' : 'net short', sc: (T.dex ?? 0) >= 0 ? C.green : C.red },
  ];
  return (
    <div style={s.ribbon}>
      {cells.map((x, i) => (
        <div key={i} style={s.cell}>
          <div style={s.cellLbl}>{x.lbl}</div>
          <div style={s.cellVal}>{x.v}</div>
          <div style={{ ...s.cellSub, color: x.sc }}>{x.s}</div>
        </div>
      ))}
    </div>
  );
}

// ── Regime panel (columna derecha de Gamma & Flow) ──────────────────────────
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
      <Seg options={[['gex', 'GEX'], ['dex', 'DEX']]} value={mode} onChange={(v) => onMode(v as any)} />
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
  const title = mode === 'dex' ? 'DELTA EXPOSURE' : 'GAMMA EXPOSURE';
  return (
    <div style={{ ...s.panelBox, padding: 0, overflow: 'hidden' }}>
      <div style={s.heatTop}><span style={s.heatTitle}>{title}</span><span style={s.heatSub}>Strike × Expiry</span></div>
      <div style={{ overflow: 'auto', maxHeight: PLOT_H }}>
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
    </div>
  );
}

// ── Flow ribbon ─────────────────────────────────────────────────────────────
function FlowRibbon({ d }: { d: FlowData }) {
  const t = d.totals || ({} as FlowData['totals']);
  const callHeavy = (t.call_notional || 0) >= (t.put_notional || 0);
  const cells = [
    { lbl: 'Call $ hoy', v: fmtBig(t.call_notional), s: 'flujo comprador', sc: C.green },
    { lbl: 'Put $ hoy', v: fmtBig(t.put_notional), s: 'flujo comprador', sc: C.red },
    { lbl: 'Sesgo', v: callHeavy ? 'CALL HEAVY' : 'PUT HEAVY', s: 'del flujo $', sc: callHeavy ? C.green : C.red },
    { lbl: 'Nivel top', v: t.top_strike != null ? `$${fmtLevel(t.top_strike)}` : '—', s: 'más $ hoy', sc: C.muted },
  ];
  return (
    <div style={s.ribbon}>
      {cells.map((x, i) => (
        <div key={i} style={s.cell}>
          <div style={s.cellLbl}>{x.lbl}</div>
          <div style={s.cellVal}>{x.v}</div>
          <div style={{ ...s.cellSub, color: x.sc }}>{x.s}</div>
        </div>
      ))}
    </div>
  );
}

// ── estilos (gama del Aula) ─────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  topbar: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  brand: { fontFamily: 'var(--font-bricolage), sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text)' },
  select: { backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)', padding: '9px 12px', fontSize: 14, minWidth: 180, fontFamily: 'ui-monospace, monospace' },
  symName: { color: 'var(--text-muted)', fontSize: 13, fontFamily: 'ui-monospace, monospace' },
  tabs: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 },
  tab: { flex: '0 0 auto', backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-pill)', padding: '8px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' },
  tabActive: { backgroundColor: 'var(--primary)', color: '#0A0B0E', borderColor: 'var(--primary)' },
  controls: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  seg: { display: 'inline-flex', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' },
  segBtn: { background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  segBtnActive: { backgroundColor: 'var(--primary)', color: '#0A0B0E' },
  panelBox: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' },
  lwcStats: { color: 'var(--text-muted)', fontSize: 12, fontFamily: 'ui-monospace, monospace', padding: '2px 2px 2px' },
  gammaGrid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 12 },
  // ribbon
  ribbon: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 1,
    backgroundColor: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' },
  cell: { backgroundColor: 'var(--surface)', padding: '10px 12px' },
  cellLbl: { color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 },
  cellVal: { color: 'var(--text)', fontSize: 18, fontWeight: 700, fontFamily: 'ui-monospace, monospace', marginTop: 2 },
  cellSub: { fontSize: 11, fontWeight: 600, marginTop: 1 },
  // regime panel
  regimePanel: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 },
  rpTiles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  rpTile: { backgroundColor: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 1 },
  rpT: { color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' },
  rpV: { fontSize: 16, fontWeight: 800, fontFamily: 'ui-monospace, monospace' },
  rpSS: { color: 'var(--text-muted)', fontSize: 10.5 },
  rpSplit: { display: 'flex', height: 22, borderRadius: 'var(--r-sm)', overflow: 'hidden', fontSize: 10, fontWeight: 700 },
  rpSplitPut: { backgroundColor: 'rgba(239,68,68,.85)', color: '#fff', display: 'flex', alignItems: 'center', paddingLeft: 8, minWidth: 40 },
  rpSplitCall: { backgroundColor: 'rgba(34,197,94,.85)', color: '#06240f', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, flex: 1 },
  rpRank: { display: 'flex', flexDirection: 'column', gap: 5 },
  rpRow: { display: 'grid', gridTemplateColumns: '64px 1fr 72px', alignItems: 'center', gap: 8 },
  rpK: { color: 'var(--text-muted)', fontSize: 11.5, fontFamily: 'ui-monospace, monospace' },
  rpTrack: { background: 'var(--surface-hi)', borderRadius: 3, height: 8, overflow: 'hidden' },
  rpFill: { display: 'block', height: '100%', borderRadius: 3 },
  rpAmt: { fontSize: 11.5, fontWeight: 700, textAlign: 'right', fontFamily: 'ui-monospace, monospace' },
  rpFoot: { color: 'var(--text-dim)', fontSize: 10.5 },
  // heatmap table
  heatTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)' },
  heatTitle: { color: 'var(--text)', fontSize: 12, fontWeight: 800, letterSpacing: 0.4 },
  heatSub: { color: 'var(--text-dim)', fontSize: 11 },
  heatTable: { borderCollapse: 'collapse', width: '100%', fontFamily: 'ui-monospace, monospace' },
  heatTh: { position: 'sticky', top: 0, background: 'var(--surface)', color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, padding: '6px 8px', whiteSpace: 'nowrap', zIndex: 1 },
  heatSk: { background: 'var(--surface)', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, padding: '6px 10px', whiteSpace: 'nowrap', position: 'sticky', left: 0 },
  heatTd: { color: 'var(--text)', fontSize: 10.5, padding: '5px 8px', textAlign: 'right', whiteSpace: 'nowrap' },
};
