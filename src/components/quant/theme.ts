// Tema, formateadores y helpers del Quant — portados de
// profitlab_quant/web/app.js (colores, BASE_LAYOUT, CONFIG, formatos,
// levelShapes, escalas 3D). Mantiene la misma gama que el Aula.

export const C = {
  bg: '#0A0B0E', panel: '#14161C', grid: '#1F222B', border: '#1F222B',
  text: '#CBD5E1', muted: '#94A3B8', lime: '#C7F94C',
  green: '#22c55e', red: '#ef4444', purple: '#a855f7',
  cyan: '#06b6d4', amber: '#f59e0b', yellow: '#facc15', white: '#e8eef7',
};

export const FONT = { color: C.muted, family: 'Manrope, sans-serif', size: 11 };
export const BASE_LAYOUT: any = {
  paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
  font: FONT, dragmode: 'pan',
};
export const CONFIG: any = { responsive: true, displayModeBar: false, scrollZoom: true, doubleClick: 'reset' };
export const CONFIG3D: any = { responsive: true, displayModeBar: false, scrollZoom: true };

// En la app (móvil) usamos márgenes/cámara compactos. La detecta el viewport.
export const isNarrow = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches;

// ── formateadores ─────────────────────────────────────────────────────────
export const fmtPrice = (v: any) => (v == null || !isFinite(v)) ? '—'
  : Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtLevel = (v: any) => (v == null || !isFinite(v)) ? '—'
  : Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
export function fmtBig(v: any): string {
  if (v == null || !isFinite(v)) return '—';
  const a = Math.abs(v), sign = v < 0 ? '-' : '';
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`;
  return `${sign}$${a.toFixed(0)}`;
}
export const fmtPct = (v: any) => (v == null || !isFinite(v)) ? '—' : `${(v * 100).toFixed(2)}%`;
export const fmtInt = (v: any) => (v == null || !isFinite(v)) ? '—'
  : Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
// etiqueta compacta de celda sin símbolo de moneda: 40.2M, -128.3M, 973.6K…
export function fmtHeat(v: any): string {
  if (v == null || !isFinite(v)) return '';
  const a = Math.abs(v), s = v < 0 ? '-' : '';
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${s}${Math.round(a / 1e3)}K`;
  return `${s}${a.toFixed(0)}`;
}

// líneas punteadas de niveles (spot / call wall / put wall / gamma flip)
export function levelShapes(d: any, L: any) {
  const shapes: any[] = [], anns: any[] = [];
  const add = (val: any, color: string, label: string) => {
    if (val == null || !isFinite(val)) return;
    shapes.push({ type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: val, y1: val,
      line: { color, width: 1.4, dash: 'dot' } });
    anns.push({ xref: 'paper', x: 1, xanchor: 'right', yref: 'y', y: val, yanchor: 'bottom',
      text: label, showarrow: false, font: { size: 9, color }, bgcolor: 'rgba(5,7,11,.7)' });
  };
  add(d.spot, C.text, `SPOT ${fmtLevel(d.spot)}`);
  add(L.call_wall, C.green, 'CALL WALL');
  add(L.put_wall, C.red, 'PUT WALL');
  add(L.gamma_flip, C.purple, 'γ FLIP');
  return { shapes, anns };
}

// ── 3D ──────────────────────────────────────────────────────────────────
let _webgl: boolean | null = null;
export function webglOK(): boolean {
  if (_webgl !== null) return _webgl;
  try {
    const c = document.createElement('canvas');
    _webgl = !!((window as any).WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { _webgl = false; }
  return _webgl;
}
export const SCENE_AX = (text: string): any => ({ title: { text }, gridcolor: C.border, color: C.muted,
  backgroundcolor: 'rgba(0,0,0,0)', showbackground: true });

// escalas de color de las superficies
export const SURF_SCALE: any = [[0, C.red], [0.5, '#14161C'], [1, C.green]];
export const SPECTRUM_SCALE: any = [
  [0.0, '#ef4444'], [0.28, 'rgba(239,68,68,.78)'], [0.47, 'rgba(120,30,40,.25)'],
  [0.5, 'rgba(20,26,43,.10)'], [0.53, 'rgba(30,90,55,.25)'],
  [0.72, 'rgba(34,197,94,.78)'], [1.0, '#22c55e'],
];
export function pctAbs(flat: number[], p: number): number {
  const a = flat.filter((v) => v && isFinite(v)).map(Math.abs).sort((x, y) => x - y);
  if (!a.length) return 1;
  return a[Math.min(a.length - 1, Math.floor(p * a.length))] || a[a.length - 1] || 1;
}
// fondo divergente de celda del heatmap (azul positivo, rojo negativo)
export function heatColor(v: any, amax: number): string {
  if (v == null || !isFinite(v) || v === 0) return 'rgba(255,255,255,.02)';
  const t = Math.min(Math.abs(v) / amax, 1);
  const alpha = 0.14 + 0.80 * Math.pow(t, 0.55);
  return v > 0 ? `rgba(37,99,235,${alpha.toFixed(3)})` : `rgba(220,38,38,${alpha.toFixed(3)})`;
}
