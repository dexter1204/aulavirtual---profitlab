// Cliente de datos de Pre-Apertura (Fase 2 Mercados nativo).
// El Aula es estático y cross-origin → consume las rutas de DATOS del servicio
// Node desplegado pasando el JWT del Aula por Authorization: Bearer. El servicio
// lo valida con AULA_JWT_SECRET en su middleware (ver repo Pre-Apertura).
// No hay iframe ni cookie: el acceso al producto 'news' lo gatea el shell.
import { getToken, PREAPERTURA_URL } from '@/lib/api';
import type { Classification, ActionPlan, SocialCategory } from '@/lib/preaperturaTypes';

// Base de la API del servicio Pre-Apertura (su raíz + /api). Configurable aparte
// por si el origen de datos difiere del de la web embebida.
const PA_BASE = (
  process.env.NEXT_PUBLIC_PREAPERTURA_API_URL ??
  PREAPERTURA_URL.replace(/\/$/, '') + '/api'
).replace(/\/$/, '');

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const t = getToken();
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(extra ?? {}) };
}

export async function paGet<T = any>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(PA_BASE + path, { headers: authHeaders(), cache: 'no-store', signal });
  if (!res.ok) throw new Error(`Pre-Apertura ${path}: ${res.status}`);
  return res.json();
}

export async function paPost<T = any>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(PA_BASE + path, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  });
  if (!res.ok) throw new Error(`Pre-Apertura ${path}: ${res.status}`);
  return res.json();
}

// ---------- Shapes de respuesta (portadas de app/page.tsx) ----------
import type { NewsItem } from '@/components/preapertura/NewsList';
import type { Quote } from '@/components/preapertura/QuoteTile';
import type { PlanRow } from '@/components/preapertura/PlanCard';
import type { SocialItem } from '@/components/preapertura/SocialList';

export type NewsResp = { generatedAt: string; total: number; stats: { bull: number; bear: number; alto: number; medio: number }; items: NewsItem[] };
export type QuoteResp = { quotes: Quote[]; generatedAt: string };
export type CalResp = { today: string; todayEvents: any[]; weekly: any[] };
export type PlanResp = { plans: PlanRow[]; generatedAt: string };
export type SocialResp = {
  generatedAt: string;
  stats: { total: number; reachedSources: number; totalSources: number; high: number; bull: number; bear: number; byCategory: Record<string, number> };
  items: SocialItem[];
  failedSources?: { id: string; name: string; category: string }[];
  warning?: string;
};

export type { Classification, ActionPlan, SocialCategory };
