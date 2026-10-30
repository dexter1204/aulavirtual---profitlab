'use client';
// Pre-Apertura NATIVO en el Aula (Fase 2 Mercados). Port de app/page.tsx del
// servicio Node, sin su header/gate/logout propios: el shell del Aula ya da
// header, nav, tema y el gating de acceso (producto 'news'). Los datos salen
// del navegador contra el servicio Node con Bearer (ver src/lib/preapertura.ts).
import { useEffect, useState } from 'react';
import { NewsList, type NewsItem } from './NewsList';
import { QuoteTile, type Quote } from './QuoteTile';
import { PlanCard, type PlanRow } from './PlanCard';
import { PlanModal } from './PlanModal';
import { CalendarPanel } from './CalendarPanel';
import { SocialList, type SocialItem } from './SocialList';
import { MacroBrief } from './MacroBrief';
import { paGet, paPost, type NewsResp, type QuoteResp, type CalResp, type PlanResp, type SocialResp } from '@/lib/preapertura';

const SOCIAL_FILTERS = ['ALL', 'HIGH', 'fed-official', 'macro-official', 'whale-bsky', 'ticker', 'options', 'wsb', 'stocks'] as const;
const SOCIAL_FILTER_LABELS: Record<(typeof SOCIAL_FILTERS)[number], string> = {
  ALL: 'TODOS', HIGH: 'ALTO', 'fed-official': 'FED', 'macro-official': 'MACRO',
  'whale-bsky': 'BLUESKY', ticker: 'STOCKTW', options: 'OPCIONES', wsb: 'WSB', stocks: 'REDDIT',
};

const NEWS_FILTERS = ['ALL', 'ALTO', 'BULL', 'BEAR'] as const;
const NEWS_FILTER_LABELS: Record<(typeof NEWS_FILTERS)[number], string> = {
  ALL: 'TODOS', ALTO: 'ALTO', BULL: 'ALCISTA', BEAR: 'BAJISTA',
};

export function PreAperturaView() {
  const [news, setNews] = useState<NewsResp | null>(null);
  const [quotes, setQuotes] = useState<QuoteResp | null>(null);
  const [cal, setCal] = useState<CalResp | null>(null);
  const [plans, setPlans] = useState<PlanResp | null>(null);
  const [social, setSocial] = useState<SocialResp | null>(null);
  const [newsFilter, setNewsFilter] = useState<'ALL' | 'ALTO' | 'BULL' | 'BEAR'>('ALL');
  const [socialFilter, setSocialFilter] = useState<(typeof SOCIAL_FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [nowET, setNowET] = useState<string>('');
  const [openPlan, setOpenPlan] = useState<PlanRow | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [n, q, c, s] = await Promise.all([
        paGet<NewsResp>('/news'),
        paGet<QuoteResp>('/quotes'),
        paGet<CalResp>('/calendar'),
        paGet<SocialResp>('/social').catch(() => null),
      ]);
      setNews(n); setQuotes(q); setCal(c); setSocial(s);

      // plan combina noticias + señales sociales ponderadas + niveles por instrumento
      const combined = [
        ...(n.items ?? []),
        ...((s?.items ?? []) as SocialItem[]).map(it => ({
          classification: it.classification,
          weight: it.weight,
        })),
      ];
      const levels: Record<string, any> = {};
      for (const qt of (q?.quotes ?? [])) {
        levels[qt.key] = {
          price: qt.price, prevClose: qt.prevClose,
          dayHigh: qt.dayHigh, dayLow: qt.dayLow,
          overnightHigh: qt.overnightHigh, overnightLow: qt.overnightLow,
          vwap: qt.vwap,
          week52High: qt.week52High, week52Low: qt.week52Low,
        };
      }
      const p = await paPost<PlanResp>('/plan', { items: combined, levels });
      setPlans(p);
      setLastRefresh(new Date());
    } catch {
      /* mantiene el último estado bueno */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 120_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tick = () => setNowET(
      new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false })
    );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="font-sans text-text">
      {/* Barra de estado propia de Pre-Apertura (sin header global: lo da el shell). */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-bull shrink-0 animate-pulse" />
          <span className="text-muted">NASDAQ · US30 · SP500 · US2000 · ORO · WTI</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted hidden sm:inline">NY: <span className="text-text" suppressHydrationWarning>{nowET || '—'}</span></span>
          <span className="text-muted hidden sm:inline">Actualizado: <span className="text-text" suppressHydrationWarning>{lastRefresh ? lastRefresh.toLocaleTimeString('es-AR') : '—'}</span></span>
          <button onClick={loadAll} disabled={loading}
            className="px-2 py-1 rounded border border-border bg-panel2 hover:bg-border transition disabled:opacity-50 text-text">
            {loading ? '⟳' : '↻'} Actualizar
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(quotes?.quotes ?? []).map(q => <QuoteTile key={q.key} q={q} />)}
          {!quotes && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-panel border border-border rounded-lg p-3 h-24 animate-pulse" />
          ))}
        </section>

        <section>
          <MacroBrief news={news} social={social} quotes={quotes} plans={plans} lastRefresh={lastRefresh} />
        </section>

        <section>
          <h2 className="text-xs uppercase text-muted font-mono tracking-wider mb-2">
            Plan de acción por instrumento <span className="text-accent">·</span> derivado del flujo actual
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {(plans?.plans ?? []).map(p => <PlanCard key={p.index} row={p} onClick={() => setOpenPlan(p)} />)}
            {!plans && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-panel border border-border rounded-lg p-4 h-40 animate-pulse" />
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-5 bg-panel border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-panel2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs uppercase text-muted font-mono tracking-wider">Flujo de noticias</h3>
                {news && (
                  <span className="text-[10px] font-mono text-muted">
                    {news.total} · <span className="text-bull">{news.stats.bull}↑</span> / <span className="text-bear">{news.stats.bear}↓</span> · <span className="text-bear">{news.stats.alto} alto</span>
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                {NEWS_FILTERS.map(f => (
                  <button key={f} onClick={() => setNewsFilter(f)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded border ${newsFilter === f ? 'bg-accent/20 text-accent border-accent/50' : 'bg-panel text-muted border-border hover:text-text'}`}>
                    {NEWS_FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto scrollbar">
              {news ? <NewsList items={news.items} filter={newsFilter} /> : (
                <div className="p-8 text-center text-muted text-sm">Cargando flujo de noticias…</div>
              )}
            </div>
          </div>

          <div className="xl:col-span-4 bg-panel border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-panel2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs uppercase text-muted font-mono tracking-wider">
                  Squawks & Social <span className="text-bull">●</span>
                </h3>
                {social && (
                  <span className="text-[10px] font-mono text-muted">
                    {social.stats.total} · {social.stats.reachedSources}/{social.stats.totalSources} fuentes · <span className="text-bear">{social.stats.high} alto</span>
                  </span>
                )}
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {SOCIAL_FILTERS.map(f => (
                  <button key={f} onClick={() => setSocialFilter(f)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${socialFilter === f ? 'bg-accent/20 text-accent border-accent/50' : 'bg-panel text-muted border-border hover:text-text'}`}>
                    {SOCIAL_FILTER_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            {social?.warning && (
              <div className="px-3 py-2 border-b border-warn/40 bg-warn/10 text-[11px] text-warn font-mono">⚠ {social.warning}</div>
            )}
            {social?.failedSources && social.failedSources.length > 0 && (
              <div className="px-3 py-1.5 border-b border-border bg-panel2 text-[10px] text-muted font-mono">
                offline: {social.failedSources.map(f => f.name).join(' · ')}
              </div>
            )}
            <div className="max-h-[70vh] overflow-y-auto scrollbar">
              {social ? <SocialList items={social.items} filter={socialFilter} /> : (
                <div className="p-8 text-center text-muted text-sm">Cargando squawks…</div>
              )}
            </div>
          </div>

          <div className="xl:col-span-3 space-y-4">
            {cal && <CalendarPanel today={cal.today} todayEvents={cal.todayEvents} weekly={cal.weekly} />}

            <div className="bg-panel border border-border rounded-lg p-3">
              <h3 className="text-xs uppercase text-muted font-mono tracking-wider mb-2">Cómo usar el dashboard</h3>
              <ol className="text-xs text-text/80 space-y-1.5 list-decimal list-inside">
                <li><span className="text-accent">05:00–08:00 ET:</span> revisar cotizaciones + plan.</li>
                <li><span className="text-accent font-mono">FED</span> / <span className="text-warn font-mono">MACRO</span> = fuentes oficiales, peso máximo.</li>
                <li><span className="text-bull font-mono">BLUESKY</span> = whales que migraron (Timiraos, etc).</li>
                <li>Filtrar noticias por <span className="text-bear font-mono">ALTO</span> para catalizadores.</li>
                <li>Oro sube por miedo, dovish Fed, USD débil. Petróleo por OPEC, guerra, EIA draw.</li>
                <li>15 min antes de dato macro o EIA (miércoles 10:30 ET): no operar.</li>
                <li>El plan es <span className="italic">tesis</span>, no orden — validar con VWAP.</li>
              </ol>
            </div>
          </div>
        </section>

        <footer className="text-center text-[10px] text-muted font-mono py-4">
          ProfitLab · No es asesoramiento financiero. Herramienta de análisis pre-apertura.
        </footer>
      </div>

      {openPlan && <PlanModal row={openPlan} onClose={() => setOpenPlan(null)} />}
    </div>
  );
}
