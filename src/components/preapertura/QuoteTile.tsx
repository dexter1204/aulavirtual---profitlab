'use client';

export type Quote = {
  key: string;
  label: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  prevClose?: number | null;
  dayHigh?: number | null;
  dayLow?: number | null;
  overnightHigh?: number | null;
  overnightLow?: number | null;
  vwap?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
  marketState?: string | null;
};

const MARKET_STATE_ES: Record<string, string> = {
  PRE: 'PRE',
  REGULAR: 'ABIERTO',
  POST: 'AFTER',
  POSTPOST: 'AFTER',
  PREPRE: 'PRE',
  CLOSED: 'CERRADO',
};

export function QuoteTile({ q }: { q: Quote }) {
  const positive = (q.changePct ?? 0) >= 0;
  const color = positive ? 'text-bull' : 'text-bear';
  const arrow = positive ? '▲' : '▼';
  const state = q.marketState ? (MARKET_STATE_ES[q.marketState] ?? q.marketState) : '—';
  return (
    <div className="bg-panel border border-border rounded-lg p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted font-mono uppercase">{q.label}</span>
        <span className="text-[10px] text-muted font-mono">{state}</span>
      </div>
      <div className="text-xl font-mono font-semibold text-text">
        {q.price != null ? q.price.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '—'}
      </div>
      <div className={`text-sm font-mono ${color}`}>
        {arrow} {q.change != null ? q.change.toFixed(2) : '—'} ({q.changePct != null ? q.changePct.toFixed(2) : '—'}%)
      </div>
    </div>
  );
}
