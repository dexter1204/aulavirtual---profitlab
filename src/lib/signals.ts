// ============================================================
// Señales / Proyecciones / Conteo — capa de datos (API PHP)
// Portado desde profitlab-web (Supabase) al aula (PHP/MySQL).
// ============================================================

import { api, uploadFile } from './api';
import type { Role } from './api';

// ---------- Tipos ----------
export type SignalDirection = 'long' | 'short';
export type SignalStatus =
  | 'active' | 'be' | 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'tp4_hit' | 'sl_hit' | 'closed';
export type Audience = 'free' | 'premium' | 'all';

export type UserMini = { id: string; name: string; role: string; avatar_url: string | null };

export type SignalUpdate = {
  id: number;
  signal_id: number;
  type: string; // published|edited|be_moved|tp1_hit|tp2_hit|tp3_hit|tp4_hit|sl_hit|closed_manual|closed|note_added
  message: string | null;
  payload: any;
  created_at: string;
};

export type Signal = {
  id: number;
  author_id: string;
  trader_id: string | null;
  asset: string;
  direction: SignalDirection;
  entry_price: string;
  stop_loss: string;
  take_profit_1: string;
  take_profit_2: string | null;
  take_profit_3: string | null;
  take_profit_4: string | null;
  be_price: string | null;
  tradingview_url: string | null;
  image_url: string | null;
  notes: string | null;
  recommendations: string | null;
  audience: Audience;
  status: SignalStatus;
  result_r: string | null;
  created_at: string;
  updated_at: string;
  author?: UserMini | null;
  trader?: UserMini | null;
  updates?: SignalUpdate[];
};

export type TraderOption = { id: string; name: string; role: string };

export interface CreateSignalInput {
  asset: string;
  direction: SignalDirection;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2?: number | null;
  take_profit_3?: number | null;
  take_profit_4?: number | null;
  tradingview_url?: string | null;
  notes?: string | null;
  recommendations?: string | null;
  trader_id?: string;
  audience?: Audience;
  imageFile?: File | null;
}
export interface UpdateSignalInput {
  asset?: string;
  direction?: SignalDirection;
  entry_price?: number;
  stop_loss?: number;
  take_profit_1?: number;
  take_profit_2?: number | null;
  take_profit_3?: number | null;
  take_profit_4?: number | null;
  tradingview_url?: string | null;
  notes?: string | null;
  recommendations?: string | null;
  trader_id?: string;
  audience?: Audience;
  image_url?: string | null;
}

// ---------- Acceso (cupón / compra) ----------
export type SignalsAccess = {
  authenticated: boolean;
  user: { id: string; name: string; email: string; role: Role } | null;
  has_access: boolean;
  access_until: string | null;
  lifetime: boolean;
  price: number;
  currency: string;
  days: number;
};
export type SignalsCoupon = {
  id: string; code: string; days: number; max_uses: number; uses: number;
  active: number; expires_at: string | null; note: string | null; created_at: string;
};

export async function getSignalsState(): Promise<SignalsAccess> {
  return api<SignalsAccess>('/signals/me');
}
export async function redeemSignalsCoupon(code: string) {
  return api<{ ok: boolean; has_access: boolean; access_until: string | null; lifetime: boolean }>(
    '/signals/redeem', { method: 'POST', body: { code } });
}
export async function signalsCheckout(): Promise<{ init_point: string }> {
  return api<{ init_point: string }>('/signals/checkout', { method: 'POST' });
}
export async function listSignalsCoupons(): Promise<SignalsCoupon[]> {
  return api<SignalsCoupon[]>('/signals/coupons');
}
export async function createSignalsCoupon(input: { code?: string; days?: number; max_uses?: number; expires_at?: string | null; note?: string | null }) {
  return api<{ id: string; code: string }>('/signals/coupons', { method: 'POST', body: input });
}
export async function deleteSignalsCoupon(id: string): Promise<void> {
  await api(`/signals/coupons/${id}`, { method: 'DELETE' });
}
export async function grantSignalsAccess(userId: string, days: number): Promise<void> {
  await api('/signals/grant', { method: 'POST', body: { user_id: userId, days } });
}

// ---------- Señales (CRUD + gestión) ----------
export async function fetchSignals(): Promise<Signal[]> {
  return api<Signal[]>('/signals');
}
export async function fetchSignal(id: number): Promise<Signal> {
  return api<Signal>(`/signals/${id}`);
}
export async function createSignal(input: CreateSignalInput): Promise<Signal> {
  let image_url: string | null = null;
  if (input.imageFile) {
    const up = await uploadFile(input.imageFile);
    image_url = up.url;
  }
  const body: any = { ...input, image_url };
  delete body.imageFile;
  return api<Signal>('/signals', { method: 'POST', body });
}
export async function updateSignal(signalId: number, input: UpdateSignalInput, changesSummary?: string): Promise<void> {
  await api(`/signals/${signalId}`, { method: 'PUT', body: { ...input, changes_summary: changesSummary } });
}
export async function moveToBE(signalId: number): Promise<void> {
  await api(`/signals/${signalId}/be`, { method: 'POST' });
}
export async function markCheckpoint(signalId: number, type: 'tp1_hit' | 'tp2_hit' | 'tp3_hit', result_r: number, message?: string): Promise<void> {
  await api(`/signals/${signalId}/checkpoint`, { method: 'POST', body: { type, result_r, message } });
}
export async function closeSignal(signalId: number, type: 'tp4_hit' | 'sl_hit' | 'closed_manual', result_r: number, message?: string): Promise<void> {
  await api(`/signals/${signalId}/close`, { method: 'POST', body: { type, result_r, message } });
}
export async function deleteSignal(signalId: number): Promise<void> {
  await api(`/signals/${signalId}`, { method: 'DELETE' });
}
export async function listTraders(): Promise<TraderOption[]> {
  return api<TraderOption[]>('/signals/traders');
}

// ---------- Stats ----------
export interface StatsFilters { period: 'week' | 'month' | 'year' | 'all'; traderId?: string | null; }
export interface StatsResult {
  rTotal: number; winRate: number; closedCount: number; activeCount: number;
  partialsCount: number; rAvgPerPartial: number;
  breakdown: { tp4_hit: number; tp3_hit: number; tp2_hit: number; tp1_hit: number; sl_hit: number; closed: number; be: number; active: number };
  evolution: { date: string; r: number; tradeR: number; asset: string; id: number }[];
}
export async function fetchStats(filters: StatsFilters): Promise<StatsResult> {
  return api<StatsResult>('/signals/stats', { query: { period: filters.period, trader_id: filters.traderId ?? undefined } });
}

/** R real recalculado desde entrada/SL/TP + estado (fuente de verdad para mostrar). */
export function calculateRealR(s: Pick<Signal, 'entry_price' | 'stop_loss' | 'direction' | 'status' | 'take_profit_1' | 'take_profit_2' | 'take_profit_3' | 'take_profit_4'>): number | null {
  const entry = parseFloat(s.entry_price);
  const sl = parseFloat(s.stop_loss);
  const risk = Math.abs(entry - sl);
  if (!risk || isNaN(risk)) return 0;
  const signo = s.direction === 'long' ? 1 : -1;
  const st = s.status;
  if (!['tp1_hit', 'tp2_hit', 'tp3_hit', 'tp4_hit', 'sl_hit', 'closed'].includes(st)) return null; // sin R visible
  if (st === 'sl_hit') return -1;
  if (st === 'closed') return 0;
  const tpMap: Record<string, string | null> = {
    tp1_hit: s.take_profit_1, tp2_hit: s.take_profit_2, tp3_hit: s.take_profit_3, tp4_hit: s.take_profit_4,
  };
  const tp = tpMap[st];
  if (tp == null) return 0;
  return +(((parseFloat(tp) - entry) * signo) / risk).toFixed(2);
}

// ============================================================
// PROYECCIONES
// ============================================================
export type ProjectionDirection = 'alcista' | 'bajista';
export type ProjectionProbability = 'alta' | 'media' | 'baja';
export type ProjectionStatus = 'active' | 'archived';

export type ProjectionUpdate = {
  id: number; projection_id: number; type: string; message: string | null; payload: any; created_at: string;
};
export type Projection = {
  id: number; author_id: string; trader_id: string | null;
  title: string; direction: ProjectionDirection; probability: ProjectionProbability;
  description: string | null; image_url: string | null; tradingview_url: string | null;
  audience: Audience; status: ProjectionStatus; created_at: string; updated_at: string;
  author?: UserMini | null; trader?: UserMini | null; updates?: ProjectionUpdate[];
};
export interface CreateProjectionInput {
  title: string; direction: ProjectionDirection; probability: ProjectionProbability;
  description?: string | null; tradingview_url?: string | null; trader_id?: string; audience?: Audience; imageFile?: File | null;
}
export interface UpdateProjectionInput {
  title?: string; direction?: ProjectionDirection; probability?: ProjectionProbability;
  description?: string | null; tradingview_url?: string | null; trader_id?: string; audience?: Audience;
  image_url?: string | null; imageFile?: File | null; removeImage?: boolean;
}

export async function fetchProjections(): Promise<Projection[]> {
  return api<Projection[]>('/projections');
}
export async function fetchProjection(id: number): Promise<Projection> {
  return api<Projection>(`/projections/${id}`);
}
export async function createProjection(input: CreateProjectionInput): Promise<Projection> {
  let image_url: string | null = null;
  if (input.imageFile) { const up = await uploadFile(input.imageFile); image_url = up.url; }
  const body: any = { ...input, image_url }; delete body.imageFile;
  return api<Projection>('/projections', { method: 'POST', body });
}
export async function updateProjection(id: number, input: UpdateProjectionInput, changesSummary?: string): Promise<void> {
  const body: any = { ...input, changes_summary: changesSummary };
  if (input.imageFile) { const up = await uploadFile(input.imageFile); body.image_url = up.url; }
  else if (input.removeImage) body.image_url = null;
  delete body.imageFile; delete body.removeImage;
  await api(`/projections/${id}`, { method: 'PUT', body });
}
export async function archiveProjection(id: number): Promise<void> {
  await api(`/projections/${id}/archive`, { method: 'POST' });
}
export async function deleteProjection(id: number): Promise<void> {
  await api(`/projections/${id}`, { method: 'DELETE' });
}

// ============================================================
// CONTEO · SESIONES OPERATIVAS
// ============================================================
export type SessionType = 'ny' | 'asia' | 'backtesting' | 'otra';
export type OperatingSession = {
  id: number; author_id: string; session_date: string; session_type: SessionType;
  result_rr: string; trades_count: number; note: string | null; audience: Audience;
  created_at: string; updated_at: string; author?: UserMini | null;
};
export const SESSION_META: Record<SessionType, { label: string; icon: string; color: string }> = {
  ny: { label: 'TEV New York', icon: '🗽', color: '#3B82F6' },
  asia: { label: 'TEV Asia', icon: '🌏', color: '#EF4444' },
  backtesting: { label: 'Backtesting', icon: '📊', color: '#C7F94C' },
  otra: { label: 'Otra sesión', icon: '📈', color: '#94A3B8' },
};
export interface CreateSessionInput {
  session_date: string; session_type: SessionType; result_rr: number;
  trades_count?: number; note?: string | null; audience?: Audience;
}
export async function fetchSessions(limit = 60): Promise<OperatingSession[]> {
  return api<OperatingSession[]>('/sessions', { query: { limit } });
}
export async function createSession(input: CreateSessionInput): Promise<OperatingSession> {
  return api<OperatingSession>('/sessions', { method: 'POST', body: input });
}
export async function updateSession(id: number, input: Partial<CreateSessionInput>): Promise<void> {
  await api(`/sessions/${id}`, { method: 'PUT', body: input });
}
export async function deleteSession(id: number): Promise<void> {
  await api(`/sessions/${id}`, { method: 'DELETE' });
}
export interface SessionsSummary {
  totalRR: number; sessionsCount: number; positiveCount: number; negativeCount: number; bestRR: number; worstRR: number;
}
export function summarizeSessions(sessions: OperatingSession[]): SessionsSummary {
  if (!sessions.length) return { totalRR: 0, sessionsCount: 0, positiveCount: 0, negativeCount: 0, bestRR: 0, worstRR: 0 };
  const rrs = sessions.map((s) => parseFloat(s.result_rr) || 0);
  return {
    totalRR: +rrs.reduce((a, b) => a + b, 0).toFixed(2),
    sessionsCount: sessions.length,
    positiveCount: rrs.filter((r) => r > 0).length,
    negativeCount: rrs.filter((r) => r < 0).length,
    bestRR: Math.max(...rrs),
    worstRR: Math.min(...rrs),
  };
}
