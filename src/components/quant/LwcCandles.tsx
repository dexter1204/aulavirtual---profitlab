'use client';

import { useEffect, useRef } from 'react';

// Carga diferida de lightweight-charts (TradingView). Usada por las vistas
// Chart, Volume Profile y Niveles (motor "lwc" en la web del Quant).
let _lwc: Promise<any> | null = null;
function loadLwc(): Promise<any> { if (!_lwc) _lwc = import('lightweight-charts'); return _lwc; }

export type LwcCandle = { time: number; open: number; high: number; low: number; close: number };
export type LwcPriceLine = { price: number; color: string; title: string; solid?: boolean };
export type LwcOverlay = (ctx: CanvasRenderingContext2D, info: { series: any; chart: any; width: number; height: number }) => void;

function lwcOpts(LC: any) {
  return {
    layout: { background: { color: 'transparent' }, textColor: '#8b98a9' },
    grid: { vertLines: { color: 'rgba(128,128,128,.1)' }, horzLines: { color: 'rgba(128,128,128,.1)' } },
    rightPriceScale: { borderColor: 'rgba(128,128,128,.2)' },
    timeScale: { borderColor: 'rgba(128,128,128,.2)', timeVisible: true, secondsVisible: false },
    crosshair: { mode: LC.CrosshairMode.Normal },
  };
}

function applyData(r: any, candles: LwcCandle[], priceLines: LwcPriceLine[], fitKey?: string) {
  r.series.setData(candles || []);
  (r.lines || []).forEach((l: any) => { try { r.series.removePriceLine(l); } catch { /* ignore */ } });
  r.lines = (priceLines || []).map((pl) => r.series.createPriceLine({
    price: pl.price, color: pl.color, lineWidth: pl.solid ? 2 : 1, lineStyle: pl.solid ? 0 : 2,
    axisLabelVisible: true, title: pl.title,
  }));
  if (r.lastFit !== fitKey) { try { r.chart.timeScale().fitContent(); } catch { /* ignore */ } r.lastFit = fitKey; }
}

/** Velas TradingView (lightweight-charts) con price-lines y un overlay de canvas
 *  opcional (histograma/perfil alineado al eje de precio). El chart se crea una
 *  vez y se reutiliza en re-render; se purga al desmontar. */
export function LwcCandles({ candles, priceLines = [], overlay, fitKey, style }: {
  candles: LwcCandle[]; priceLines?: LwcPriceLine[]; overlay?: LwcOverlay; fitKey?: string; style?: React.CSSProperties;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const st = useRef<any>({ lines: [], lastFit: null });
  const overlayRef = useRef(overlay); overlayRef.current = overlay;

  useEffect(() => {
    let alive = true;
    loadLwc().then((LC) => {
      if (!alive || !hostRef.current) return;
      const host = hostRef.current;
      host.style.position = 'relative';
      const chart = LC.createChart(host, lwcOpts(LC));
      const series = chart.addCandlestickSeries({
        upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350',
      });
      let canvas: HTMLCanvasElement | null = null, cctx: CanvasRenderingContext2D | null = null;
      if (overlayRef.current) {
        canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2;';
        host.appendChild(canvas); cctx = canvas.getContext('2d');
      }
      const size = () => {
        const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
        chart.resize(w, h);
        if (canvas && cctx) { const dpr = window.devicePixelRatio || 1; canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; cctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      };
      const draw = () => {
        const ov = overlayRef.current; if (!ov || !cctx) return;
        const w = host.clientWidth, h = host.clientHeight; cctx.clearRect(0, 0, w, h);
        ov(cctx, { series, chart, width: w, height: h });
      };
      st.current.chart = chart; st.current.series = series; st.current.size = size; st.current.draw = draw; st.current.ready = true;
      if (canvas) {
        chart.timeScale().subscribeVisibleTimeRangeChange(() => requestAnimationFrame(draw));
        host.addEventListener('wheel', () => requestAnimationFrame(draw), { passive: true });
      }
      const ro = new ResizeObserver(() => { size(); requestAnimationFrame(draw); });
      ro.observe(host); st.current.ro = ro;
      applyData(st.current, candles, priceLines, fitKey);
      size(); requestAnimationFrame(draw);
    });
    return () => {
      alive = false;
      const r = st.current;
      if (r.ro) { try { r.ro.disconnect(); } catch { /* ignore */ } }
      if (r.chart) { try { r.chart.remove(); } catch { /* ignore */ } }
      st.current = { lines: [], lastFit: null };
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const r = st.current; if (!r.ready || !r.series) return;
    applyData(r, candles, priceLines, fitKey);
    r.size?.(); requestAnimationFrame(() => r.draw?.());
  }, [candles, priceLines, fitKey]);

  return <div ref={hostRef} style={{ width: '100%', height: '100%', ...style }} />;
}
