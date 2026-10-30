'use client';

import { useEffect, useRef } from 'react';

// Carga diferida de plotly.js (≈3.5MB) SOLO cuando se monta una gráfica de
// Mercados → no entra al bundle global ni al APK salvo que se abra Mercados.
let _plotly: Promise<any> | null = null;
function loadPlotly(): Promise<any> {
  if (!_plotly) _plotly = import('plotly.js-dist-min').then((m: any) => m.default || m);
  return _plotly;
}

type PlotProps = {
  data: any[];
  layout: any;
  config?: any;
  style?: React.CSSProperties;
  className?: string;
};

/** Monta una gráfica Plotly en un <div> por ref, re-renderizando con
 *  Plotly.react cuando cambian data/layout. Purga al desmontar (clave para las
 *  vistas WebGL 3D). Mismo motor que la web del Quant (Plotly.react). */
export function Plot({ data, layout, config, style, className }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadPlotly().then((Plotly) => {
      if (!alive || !ref.current) return;
      Plotly.react(ref.current, data, layout, config);
    });
    return () => { alive = false; };
  }, [data, layout, config]);

  // purga al desmontar
  useEffect(() => {
    const node = ref.current;
    return () => {
      if (node) loadPlotly().then((Plotly) => { try { Plotly.purge(node); } catch { /* ignore */ } });
    };
  }, []);

  return <div ref={ref} className={className} style={{ width: '100%', ...style }} />;
}
