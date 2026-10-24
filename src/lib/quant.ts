// Cliente del backend Quant (FastAPI en Render). Devuelve JSON numérico crudo;
// las gráficas se arman en el cliente con Plotly (src/components/quant/figures).
// Auth: el MISMO JWT del Aula (localStorage 'pl_token') como Bearer; el backend
// lo valida con el mismo jwt_secret. CORS del backend es '*', así que la app
// llama directo sin proxy.

import { getToken } from './api';

export const QUANT_API_BASE = (
  process.env.NEXT_PUBLIC_QUANT_API_URL ?? 'https://profitlab-quant.onrender.com'
).replace(/\/+$/, '');

export class QuantError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
  }
}

export async function quantApi<T = any>(path: string): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${QUANT_API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });
  } catch {
    throw new QuantError('No se pudo conectar con el servidor de Mercados.');
  }
  if (res.status === 401) throw new QuantError('Sesión expirada', 401);
  if (res.status === 403) throw new QuantError('Acceso no activo', 403);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) detail = j.detail;
    } catch { /* ignore */ }
    throw new QuantError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

// ── Tipos de respuesta (según profitlab_quant/api/main.py) ────────────────
export type Levels = {
  call_wall?: number; put_wall?: number; gamma_flip?: number; max_pain?: number;
  [k: string]: number | undefined;
};
export type Totals = { gex?: number; dex?: number; [k: string]: number | undefined };

export interface AnalyzeData {
  ticker: string; vendor?: string; spot: number; asof?: string;
  levels: Levels; totals: Totals;
  regime?: { label?: string; reading?: string; g_flip?: number; gap_pct?: number };
  strikes: number[]; gex: number[];
  dex_strikes: number[]; dex: number[];
}
export interface ChartData extends AnalyzeData {
  bars: { t: string; o: number; h: number; l: number; c: number; v: number }[];
  bars_source?: string; interval?: string; period?: string;
}
export interface FlowRow {
  strike: number; call_vol: number; put_vol: number;
  call_notional: number; put_notional: number; total_notional: number;
  oi: number; vol_oi: number; bias: 'call' | 'put';
}
export interface FlowData {
  ticker: string; spot: number; rows: FlowRow[];
  totals: { call_notional: number; put_notional: number; call_vol: number; put_vol: number; total_notional: number; top_strike: number };
}
export interface OiData {
  ticker: string; spot: number; strikes: number[];
  call_oi: number[]; put_oi: number[]; call_pct: number[]; put_pct: number[];
}
export interface HeatmapData {
  ticker: string; spot: number; strikes: number[];
  expiries: string[]; dte: number[]; z_gex: number[][]; z_dex: number[][]; z?: number[][];
}
export interface DeltaSurfaceData {
  ticker: string; spot: number; kind: 'call' | 'put'; iv?: number;
  spot_axis: number[]; days_axis: number[]; z: number[][];
}
export interface NetDriftData {
  ticker: string; t: string[]; call_drift: number[]; put_drift: number[]; price: number[];
  totals: { call_drift: number; put_drift: number; last: number };
}
export interface VolDriftData {
  ticker: string; dte: number[]; expiries: string[];
  atm_iv: number[]; call_iv: number[]; put_iv: number[]; skew: number[];
}
export interface VolSurfaceData {
  ticker: string; spot: number; strikes: number[]; expiries: string[]; dte: number[]; z: number[][];
}
export type Candle = { time: number; open: number; high: number; low: number; close: number };
export interface VolumeProfileData {
  ticker: string; spot: number; bins: number; price: number[]; volume: number[];
  poc: number; vah: number; val: number; value_area?: number; total_volume?: number;
  low: number; high: number; candles: Candle[];
}
export interface LevelsChartData {
  ticker: string; spot: number;
  levels: { call_wall?: number; put_wall?: number; gamma_flip?: number; delta_flip?: number;
    delta_wall?: number; major_neg_delta?: number; max_pain?: number };
  regime?: any; candles: Candle[];
}
export interface VolatilityDriftData {
  ticker: string; window?: number; t: string[]; price: number[]; arv: number[]; iv?: number;
}

// ── timeframes del Chart → (interval, period) ─────────────────────────────
export const TIMEFRAMES: Record<string, { interval: string; period: string }> = {
  '1m': { interval: '1m', period: '1d' },
  '5m': { interval: '5m', period: '5d' },
  '15m': { interval: '15m', period: '1mo' },
  '1h': { interval: '60m', period: '3mo' },
  '1D': { interval: '1d', period: '1y' },
};

// ── paths por vista (symbol ya resuelto) ──────────────────────────────────
export const quantPaths = {
  analyze: (s: string) => `/api/analyze/${s}?window=24`,
  chart: (s: string, tf: string) => {
    const t = TIMEFRAMES[tf] || TIMEFRAMES['5m'];
    return `/api/chart/${s}?window=24&interval=${t.interval}&period=${t.period}`;
  },
  gexHeatmap: (s: string) => `/api/gex_heatmap/${s}`,
  spectrum: (s: string) => `/api/gex_heatmap/${s}?window=30&exp=10`,
  oi: (s: string) => `/api/oi/${s}?window=24`,
  flow: (s: string) => `/api/flow/${s}?top=18`,
  deltaSurface: (s: string, kind: string) => `/api/delta_surface/${s}?kind=${kind}`,
  netDrift: (s: string) => `/api/net_drift/${s}`,
  volDrift: (s: string) => `/api/vol_drift/${s}`,
  volSurface: (s: string) => `/api/vol_surface/${s}`,
  volatilityDrift: (s: string) => `/api/volatility_drift/${s}`,
  volumeProfile: (s: string) => `/api/volume_profile/${s}?bins=48`,
  levelsChart: (s: string) => `/api/levels_chart/${s}?window=24`,
};
