// Universo de tickers del Quant — portado de profitlab_quant/web/universe.js
// (que a su vez refleja profitlab/universe.py). Tres grupos: Options (acciones
// y ETFs) · Futures (→ gamma del índice) · Indices. Los futuros mapean al
// índice/ETF cuya gamma de opciones realmente los mueve (ES → SPX, etc.).

export const QUANT_OPTIONS = [
  'QQQ', 'SPY', 'IWM', 'DIA', 'VOO', 'VTI',
  'GLD', 'SLV', 'USO', 'UNG', 'GDX', 'GDXJ',
  'TLT', 'IEF', 'HYG', 'LQD',
  'XLE', 'XLF', 'XLK', 'XLV', 'XLI', 'XLP', 'XLU', 'XLY', 'XLB', 'XLRE', 'XLC',
  'SMH', 'SOXL', 'SOXS', 'TQQQ', 'SQQQ', 'SPXL', 'SPXS',
  'ARKK', 'KWEB', 'FXI', 'EEM', 'EFA', 'EWZ',
  'UVXY', 'VXX', 'SVXY',
  'BITO', 'IBIT', 'ETHA',
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA',
  'AVGO', 'AMD', 'NFLX', 'ADBE', 'CRM', 'ORCL', 'CSCO', 'INTC', 'QCOM',
  'TXN', 'MU', 'AMAT', 'ARM', 'SMCI', 'PLTR', 'SNOW', 'NOW', 'PANW',
  'BRK.B', 'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'SCHW', 'V', 'MA', 'AXP',
  'UNH', 'JNJ', 'LLY', 'PFE', 'MRK', 'ABBV', 'TMO', 'ABT', 'DHR',
  'XOM', 'CVX', 'COP', 'SLB', 'OXY',
  'WMT', 'COST', 'HD', 'LOW', 'TGT', 'NKE', 'MCD', 'SBUX', 'DIS',
  'PG', 'KO', 'PEP', 'PM', 'MDLZ',
  'BA', 'CAT', 'DE', 'GE', 'HON', 'UPS', 'FDX', 'LMT', 'RTX',
  'T', 'VZ', 'TMUS', 'CMCSA',
  'COIN', 'HOOD', 'SOFI', 'MSTR', 'MARA', 'RIOT', 'CLSK',
  'GME', 'AMC', 'RKLB', 'ACHR', 'LUNR',
  'UBER', 'LYFT', 'ABNB', 'DASH', 'SHOP', 'SQ', 'PYPL', 'ROKU',
  'DKNG', 'RBLX', 'U', 'NET', 'DDOG', 'CRWD', 'ZS', 'MDB',
  'F', 'GM', 'RIVN', 'LCID', 'NIO', 'XPEV', 'LI',
  'BABA', 'PDD', 'JD', 'CVNA', 'AFRM', 'UPST', 'DJT', 'OKLO',
];

// El usuario ve el símbolo del futuro; el valor es el subyacente que carga la API.
export const FUTURES_MAP: Record<string, string> = {
  ES: 'SPX', MES: 'SPX',
  NQ: 'NDX', MNQ: 'NDX',
  YM: 'DJX', MYM: 'DJX',
  RTY: 'RUT', M2K: 'RUT',
  CL: 'USO', MCL: 'USO',
  GC: 'GLD', MGC: 'GLD',
  SI: 'SLV',
  ZB: 'TLT', ZN: 'IEF',
};
export const QUANT_FUTURES = Object.keys(FUTURES_MAP);
export const QUANT_INDICES = ['SPX', 'NDX', 'VIX', 'RUT', 'DJX', 'OEX'];

export const QUANT_DEFAULT_TICKER = 'QQQ';

export const QUANT_GROUPS: { label: string; syms: string[] }[] = [
  { label: 'OPTIONS · acciones y ETFs', syms: QUANT_OPTIONS },
  { label: 'FUTUROS → gamma del índice', syms: QUANT_FUTURES },
  { label: 'ÍNDICES', syms: QUANT_INDICES },
];

/** Resuelve el pick del dropdown al símbolo que la API debe cargar. */
export function resolveTicker(pick: string): string {
  if (!pick) return QUANT_DEFAULT_TICKER;
  const p = pick.trim().toUpperCase();
  return FUTURES_MAP[p] || p;
}

export function isFutures(pick: string): boolean {
  return !!pick && pick.trim().toUpperCase() in FUTURES_MAP;
}

/** Etiqueta para una opción del selector (los futuros muestran "ES → SPX"). */
export function tickerLabel(sym: string): string {
  return isFutures(sym) ? `${sym}  →  ${FUTURES_MAP[sym]}` : sym;
}
