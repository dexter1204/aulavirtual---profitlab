'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { Level, SetupLevel } from '@/lib/preaperturaTypes';
import { paGet } from '@/lib/preapertura';

type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };

const INTERVAL_OPTIONS = [
  { label: '5m', range: '1d',  interval: '5m'  },
  { label: '15m',range: '5d',  interval: '15m' },
  { label: '1h', range: '1mo', interval: '60m' },
  { label: '1D', range: '6mo', interval: '1d'  },
] as const;

const LEVEL_COLORS: Record<string, string> = {
  'Precio actual':  '#C7F94C',
  'Cierre previo':  '#a78bfa',
  'Máx overnight':  '#ef4444',
  'Máx día':        '#f87171',
  'Mín overnight':  '#10b981',
  'Mín día':        '#34d399',
  'Máx 52s':        '#64748b',
  'Mín 52s':        '#64748b',
};

function fmt(v: number): string {
  const d = v >= 1000 ? 0 : v >= 100 ? 1 : v >= 10 ? 2 : 3;
  return v.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

type OverlayShape =
  | { type: 'rect'; x: number; y: number; w: number; h: number; fill: string; stroke: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; dash?: string; width: number }
  | { type: 'label'; x: number; y: number; text: string; sub: string; color: string };

export function LightweightChart({
  symbol, levels, setup,
}: {
  symbol: string;
  levels?: Level[];
  setup?: SetupLevel[];
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const volSeriesRef = useRef<any>(null);
  const vwapSeriesRef = useRef<any>(null);
  const vwapUpper1Ref = useRef<any>(null);
  const vwapUpper2Ref = useRef<any>(null);
  const vwapLower1Ref = useRef<any>(null);
  const vwapLower2Ref = useRef<any>(null);
  const priceLinesRef = useRef<any[]>([]);

  const setupRef = useRef<SetupLevel[] | undefined>(setup);
  const levelsRef = useRef<Level[] | undefined>(levels);
  useEffect(() => { setupRef.current = setup; }, [setup]);
  useEffect(() => { levelsRef.current = levels; }, [levels]);

  const [range, setRange] = useState<typeof INTERVAL_OPTIONS[number]>(INTERVAL_OPTIONS[1]);
  const [bars, setBars] = useState<Bar[] | null>(null);
  const [chartReady, setChartReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<{ shapes: OverlayShape[]; w: number; h: number }>({ shapes: [], w: 0, h: 0 });

  useEffect(() => {
    let cancelled = false;
    setBars(null); setError(null);
    paGet<{ bars?: Bar[] }>(`/chart?symbol=${encodeURIComponent(symbol)}&range=${range.range}&interval=${range.interval}`)
      .then(j => {
        if (cancelled) return;
        if (j?.bars) setBars(j.bars);
        else setError('Sin datos');
      })
      .catch(() => { if (!cancelled) setError('Error fetch'); });
    return () => { cancelled = true; };
  }, [symbol, range]);

  // Computa el overlay del position tool → estado React (no innerHTML)
  const computeOverlay = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const wrapper = wrapperRef.current;
    const setup = setupRef.current;
    if (!chart || !series || !wrapper) return;
    if (!setup || setup.length === 0) { setOverlay({ shapes: [], w: 0, h: 0 }); return; }

    const rect = wrapper.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    if (W < 10 || H < 10) return;

    const entry = setup.find(s => s.kind === 'entry');
    const stop = setup.find(s => s.kind === 'stop');
    const targets = setup.filter(s => s.kind === 'target');
    if (!entry) { setOverlay({ shapes: [], w: W, h: H }); return; }

    const yEntry = series.priceToCoordinate(entry.value);
    if (yEntry == null || !isFinite(yEntry)) { setOverlay({ shapes: [], w: W, h: H }); return; }

    const rightX = W - 62;
    const leftX = Math.max(60, W * 0.55);

    const topTarget = targets.reduce<number | null>((acc, t) => acc == null ? t.value : Math.max(acc, t.value), null);
    const bottomTarget = targets.reduce<number | null>((acc, t) => acc == null ? t.value : Math.min(acc, t.value), null);
    const isLong = (topTarget != null && topTarget > entry.value)
      || (stop != null && stop.value < entry.value);
    const primaryTarget = isLong ? topTarget : bottomTarget;

    const shapes: OverlayShape[] = [];

    // Zona TP (verde)
    if (primaryTarget != null) {
      const yT = series.priceToCoordinate(primaryTarget);
      if (yT != null && isFinite(yT)) {
        const y1 = Math.min(yEntry, yT);
        const y2 = Math.max(yEntry, yT);
        shapes.push({ type: 'rect', x: leftX, y: y1, w: rightX - leftX, h: y2 - y1,
          fill: 'rgba(16,185,129,0.14)', stroke: 'rgba(16,185,129,0.55)' });
      }
    }
    // Zona SL (roja)
    if (stop != null) {
      const yS = series.priceToCoordinate(stop.value);
      if (yS != null && isFinite(yS)) {
        const y1 = Math.min(yEntry, yS);
        const y2 = Math.max(yEntry, yS);
        shapes.push({ type: 'rect', x: leftX, y: y1, w: rightX - leftX, h: y2 - y1,
          fill: 'rgba(239,68,68,0.14)', stroke: 'rgba(239,68,68,0.55)' });
      }
    }
    // Entry (sólida cyan)
    shapes.push({ type: 'line', x1: leftX, y1: yEntry, x2: rightX, y2: yEntry, color: '#C7F94C', width: 2 });
    const dirLabel = isLong ? 'LONG' : 'SHORT';
    shapes.push({ type: 'label', x: leftX, y: yEntry, text: `${dirLabel} ENTRY`, sub: fmt(entry.value), color: '#C7F94C' });

    // Stop
    if (stop != null) {
      const yS = series.priceToCoordinate(stop.value);
      if (yS != null && isFinite(yS)) {
        const distPct = Math.abs((stop.value - entry.value) / entry.value) * 100;
        shapes.push({ type: 'line', x1: leftX, y1: yS, x2: rightX, y2: yS, color: '#ef4444', dash: '4,3', width: 2 });
        shapes.push({ type: 'label', x: leftX, y: yS, text: `STOP · -${distPct.toFixed(2)}%`, sub: fmt(stop.value), color: '#ef4444' });
      }
    }
    // Targets con R:R
    const riskPrice = stop != null ? Math.abs(entry.value - stop.value) : null;
    for (const t of targets) {
      const yT = series.priceToCoordinate(t.value);
      if (yT == null || !isFinite(yT)) continue;
      const reward = Math.abs(t.value - entry.value);
      const rr = (riskPrice && riskPrice > 0) ? (reward / riskPrice).toFixed(2) : null;
      const distPct = Math.abs((t.value - entry.value) / entry.value) * 100;
      shapes.push({ type: 'line', x1: leftX, y1: yT, x2: rightX, y2: yT, color: '#10b981', dash: '4,3', width: 2 });
      const label = `${t.label}${rr ? ` · R:R ${rr}` : ''}`;
      shapes.push({ type: 'label', x: leftX, y: yT, text: `${label} · +${distPct.toFixed(2)}%`, sub: fmt(t.value), color: '#10b981' });
    }

    setOverlay({ shapes, w: W, h: H });
  }, []);

  // Actualiza PriceLines técnicos (dashed) en el chart
  const applyPriceLines = useCallback(() => {
    const series = seriesRef.current;
    if (!series) return;
    for (const line of priceLinesRef.current) {
      try { series.removePriceLine(line); } catch {}
    }
    priceLinesRef.current = [];
    for (const l of (levelsRef.current ?? [])) {
      if (l.label === 'VWAP') continue;
      const color = LEVEL_COLORS[l.label] ?? '#64748b';
      const isDashed = l.label !== 'Precio actual';
      const line = series.createPriceLine({
        price: l.value,
        color,
        lineWidth: l.label === 'Precio actual' ? 2 : 1,
        lineStyle: isDashed ? 2 : 0,
        axisLabelVisible: true,
        title: l.label,
      });
      priceLinesRef.current.push(line);
    }
  }, []);

  // Chart init (async)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const lwc = await import('lightweight-charts');
      if (!mounted || !containerRef.current) return;

      const chart = lwc.createChart(containerRef.current, {
        layout: { background: { color: '#0f172a' }, textColor: '#e2e8f0', fontFamily: 'ui-monospace, Menlo, monospace' },
        grid:   { vertLines: { color: '#1f2937' }, horzLines: { color: '#1f2937' } },
        rightPriceScale: { borderColor: '#1f2937', scaleMargins: { top: 0.1, bottom: 0.25 } },
        timeScale: { borderColor: '#1f2937', timeVisible: true, secondsVisible: false },
        crosshair: { mode: lwc.CrosshairMode.Normal },
        autoSize: true,
      });

      const candles = chart.addCandlestickSeries({
        upColor: '#10b981', downColor: '#ef4444',
        borderUpColor: '#10b981', borderDownColor: '#ef4444',
        wickUpColor: '#10b981', wickDownColor: '#ef4444',
      });
      const vol = chart.addHistogramSeries({
        color: '#334155',
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

      const vwapLine = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'VWAP',
        crosshairMarkerVisible: true,
      });
      // Bandas de desvío estándar del VWAP — soporte/resistencia dinámico
      const mkBand = (color: string, width: 1 | 2, dash: boolean, title: string) =>
        chart.addLineSeries({
          color,
          lineWidth: width,
          lineStyle: dash ? 2 : 0,
          priceLineVisible: false,
          lastValueVisible: true,
          title,
          crosshairMarkerVisible: false,
        });
      const vwapUpper1 = mkBand('rgba(245,158,11,0.55)', 1, true,  'VWAP +1σ');
      const vwapLower1 = mkBand('rgba(245,158,11,0.55)', 1, true,  'VWAP -1σ');
      const vwapUpper2 = mkBand('rgba(245,158,11,0.85)', 1, true,  'VWAP +2σ');
      const vwapLower2 = mkBand('rgba(245,158,11,0.85)', 1, true,  'VWAP -2σ');

      chartRef.current = chart;
      seriesRef.current = candles;
      volSeriesRef.current = vol;
      vwapSeriesRef.current = vwapLine;
      vwapUpper1Ref.current = vwapUpper1;
      vwapLower1Ref.current = vwapLower1;
      vwapUpper2Ref.current = vwapUpper2;
      vwapLower2Ref.current = vwapLower2;

      chart.timeScale().subscribeVisibleTimeRangeChange(computeOverlay);
      chart.timeScale().subscribeVisibleLogicalRangeChange(computeOverlay);

      if (wrapperRef.current) {
        const ro = new ResizeObserver(() => computeOverlay());
        ro.observe(wrapperRef.current);
        (chartRef.current as any).__ro = ro;
      }

      setChartReady(true);
    })();
    return () => {
      mounted = false;
      priceLinesRef.current = [];
      const ro = (chartRef.current as any)?.__ro;
      ro?.disconnect?.();
      chartRef.current?.remove?.();
      chartRef.current = null;
      seriesRef.current = null;
      volSeriesRef.current = null;
      vwapSeriesRef.current = null;
      vwapUpper1Ref.current = null;
      vwapLower1Ref.current = null;
      vwapUpper2Ref.current = null;
      vwapLower2Ref.current = null;
      setChartReady(false);
    };
  }, [computeOverlay]);

  // Set data cuando chart y bars están listos
  useEffect(() => {
    if (!chartReady || !bars || !seriesRef.current || !volSeriesRef.current) return;
    const candleData = bars.map(b => ({ time: b.time as any, open: b.open, high: b.high, low: b.low, close: b.close }));
    const volData = bars.map(b => ({
      time: b.time as any,
      value: b.volume,
      color: b.close >= b.open ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)',
    }));
    seriesRef.current.setData(candleData);
    volSeriesRef.current.setData(volData);

    // VWAP corrido + bandas ±1σ y ±2σ (desvío estándar volumétrico ponderado)
    // σ² = Σ(v · (typ - vwap)²) / Σ(v) — usando la forma incremental para no re-recorrer
    const vwapPts:    { time: any; value: number }[] = [];
    const up1Pts:     { time: any; value: number }[] = [];
    const dn1Pts:     { time: any; value: number }[] = [];
    const up2Pts:     { time: any; value: number }[] = [];
    const dn2Pts:     { time: any; value: number }[] = [];
    let cumPV = 0, cumVol = 0, cumP2V = 0, lastKey = -1;
    const isDaily = range.interval === '1d';
    for (const b of bars) {
      const key = isDaily
        ? Math.floor((b.time - 4 * 86400) / (7 * 86400))
        : Math.floor((b.time - 5 * 3600) / 86400);
      if (key !== lastKey) { cumPV = 0; cumVol = 0; cumP2V = 0; lastKey = key; }
      const typ = (b.high + b.low + b.close) / 3;
      const v = b.volume > 0 ? b.volume : 1;
      cumPV  += typ * v;
      cumP2V += typ * typ * v;
      cumVol += v;
      if (cumVol > 0) {
        const vwap = cumPV / cumVol;
        // σ² = E[typ²] - E[typ]² usando pesos por volumen
        const variance = Math.max(0, cumP2V / cumVol - vwap * vwap);
        const sigma = Math.sqrt(variance);
        vwapPts.push({ time: b.time as any, value: vwap });
        up1Pts.push({ time: b.time as any, value: vwap + sigma });
        dn1Pts.push({ time: b.time as any, value: vwap - sigma });
        up2Pts.push({ time: b.time as any, value: vwap + 2 * sigma });
        dn2Pts.push({ time: b.time as any, value: vwap - 2 * sigma });
      }
    }
    vwapSeriesRef.current?.setData(vwapPts);
    vwapUpper1Ref.current?.setData(up1Pts);
    vwapLower1Ref.current?.setData(dn1Pts);
    vwapUpper2Ref.current?.setData(up2Pts);
    vwapLower2Ref.current?.setData(dn2Pts);

    chartRef.current?.timeScale?.().fitContent();
    applyPriceLines();
    // Doble rAF + setTimeout de respaldo
    requestAnimationFrame(() => requestAnimationFrame(computeOverlay));
    setTimeout(computeOverlay, 250);
  }, [bars, range, chartReady, applyPriceLines, computeOverlay]);

  useEffect(() => {
    if (!chartReady) return;
    applyPriceLines();
    requestAnimationFrame(() => requestAnimationFrame(computeOverlay));
    setTimeout(computeOverlay, 250);
  }, [levels, setup, chartReady, applyPriceLines, computeOverlay]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-panel2">
        <span className="text-[10px] text-muted font-mono uppercase mr-2">Timeframe</span>
        {INTERVAL_OPTIONS.map(o => (
          <button key={o.label} onClick={() => setRange(o)}
            className={`px-2 py-0.5 text-[11px] font-mono rounded border ${range.label === o.label ? 'bg-accent/20 text-accent border-accent/50' : 'bg-panel text-muted border-border hover:text-text'}`}>
            {o.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted font-mono">{symbol}</span>
      </div>
      <div ref={wrapperRef} className="flex-1 relative">
        {!bars && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-sm z-10">Cargando chart…</div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-bear text-sm z-10">Sin datos: {error}</div>
        )}
        <div ref={containerRef} className="absolute inset-0" />
        {overlay.shapes.length > 0 && overlay.w > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={overlay.w}
            height={overlay.h}
            viewBox={`0 0 ${overlay.w} ${overlay.h}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {overlay.shapes.map((s, i) => {
              if (s.type === 'rect') {
                return <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} stroke={s.stroke} strokeWidth={1} />;
              }
              if (s.type === 'line') {
                return <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} />;
              }
              // label
              const w = Math.max(s.text.length, s.sub.length) * 6.5 + 12;
              const yTop = Math.max(2, Math.min(overlay.h - 30, s.y - 14));
              return (
                <g key={i} transform={`translate(${s.x - w - 4}, ${yTop})`}>
                  <rect x={0} y={0} width={w} height={28} rx={3} fill={s.color} opacity={0.92} />
                  <text x={6} y={12} fontSize={10} fontFamily="ui-monospace, Menlo, monospace" fontWeight={700} fill="#0a0e1a">{s.text}</text>
                  <text x={6} y={24} fontSize={10} fontFamily="ui-monospace, Menlo, monospace" fill="#0a0e1a">{s.sub}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
