// Tipos de datos de Pre-Apertura, portados 1:1 del servicio Node
// (repos/Plataforma-Pre---Apertura---Profitlab: lib/analyzer.ts + lib/social.ts).
// Solo tipos — la lógica (clasificador, motor de plan) vive en el servicio y se
// consume por HTTP. Ver [[mercados-nativo]].

export type Impact = 'ALTO' | 'MEDIO' | 'BAJO';
export type Bias = 'BULL' | 'BEAR' | 'NEUTRO' | 'MIXTO';
export type IndexKey = 'NQ' | 'YM' | 'ES' | 'RTY' | 'GC' | 'CL';

export type Classification = {
  impact: Impact;
  bias: Bias;
  indices: IndexKey[];
  tags: string[];
  score: number;
  perIndex: Partial<Record<IndexKey, Bias>>;
};

export type Level = { label: string; value: number };
export type SetupLevel = { kind: 'entry' | 'stop' | 'target'; label: string; value: number };

export type ActionPlan = {
  headline: string;
  detail: string;
  levels: Level[];
  setup?: SetupLevel[];
  entry?: string;
  stop?: string;
  targets?: string[];
  invalidations: string[];
  color: 'bull' | 'bear' | 'warn' | 'muted';
};

export type SocialCategory =
  | 'fed-official'
  | 'macro-official'
  | 'wsb'
  | 'stocks'
  | 'options'
  | 'ticker'
  | 'whale-bsky';
