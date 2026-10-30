'use client';
import { useMemo } from 'react';
import type { NewsItem } from './NewsList';
import type { Quote } from './QuoteTile';
import type { PlanRow } from './PlanCard';
import type { SocialItem } from './SocialList';

type Props = {
  news: { items: NewsItem[] } | null;
  social: { items: SocialItem[] } | null;
  quotes: { quotes: Quote[] } | null;
  plans: { plans: PlanRow[] } | null;
  lastRefresh: Date | null;
};

type Catalyst = {
  title: string;
  source: string;
  tags: string[];
  bias: string;
  impact: string;
};

type Alignment = {
  key: string;
  label: string;
  changePct: number | null;
  priceDir: 'UP' | 'DOWN' | 'FLAT';
  planBias: 'BULL' | 'BEAR' | 'WARN' | 'MUTED';
  status: 'CONFIRMACIÓN' | 'DIVERGENCIA' | 'NEUTRAL' | 'EVENTO';
  reason: string;
};

function computeBrief(news: Props['news'], social: Props['social'], quotes: Props['quotes'], plans: Props['plans']) {
  const newsItems = news?.items ?? [];
  const socialItems = (social?.items ?? []).map(s => ({
    title: s.title,
    source: s.sourceName,
    classification: s.classification,
    weight: s.weight,
  }));
  const allItems = [
    ...newsItems.map(n => ({ title: n.title, source: n.source, classification: n.classification, weight: 1 })),
    ...socialItems,
  ];

  // Score neto ponderado por impacto y peso de fuente
  let netScore = 0;
  let bullCount = 0, bearCount = 0, altoCount = 0;
  for (const item of allItems) {
    const w = item.weight ?? 1;
    const bias = item.classification?.bias;
    const imp = item.classification?.impact;
    const impMult = imp === 'ALTO' ? 3 : imp === 'MEDIO' ? 2 : 1;
    if (imp === 'ALTO') altoCount++;
    if (bias === 'BULL') { netScore += w * impMult; bullCount++; }
    if (bias === 'BEAR') { netScore -= w * impMult; bearCount++; }
  }

  const overallBias: 'BULL' | 'BEAR' | 'MIXTO' =
    netScore > 15 ? 'BULL' : netScore < -15 ? 'BEAR' : 'MIXTO';

  // Top catalizadores ALTO impact ordenados por sesgo fuerte
  const catalysts: Catalyst[] = allItems
    .filter(i => i.classification?.impact === 'ALTO' && (i.classification?.bias === 'BULL' || i.classification?.bias === 'BEAR'))
    .slice(0, 6)
    .map(i => ({
      title: i.title,
      source: i.source,
      tags: (i.classification?.tags ?? []).slice(0, 2),
      bias: i.classification?.bias ?? 'NEUTRO',
      impact: i.classification?.impact ?? 'BAJO',
    }));

  // Alineación precio vs plan por instrumento
  const alignment: Alignment[] = (quotes?.quotes ?? []).map(q => {
    const plan = plans?.plans?.find(p => p.index === q.key);
    const pct = q.changePct ?? 0;
    const priceDir: 'UP' | 'DOWN' | 'FLAT' = pct > 0.1 ? 'UP' : pct < -0.1 ? 'DOWN' : 'FLAT';
    const planColor = (plan?.plan?.color ?? 'muted').toUpperCase() as 'BULL' | 'BEAR' | 'WARN' | 'MUTED';

    let status: Alignment['status'];
    let reason: string;
    if (planColor === 'WARN') {
      status = 'EVENTO';
      reason = 'Evento pendiente — esperar dato antes de operar';
    } else if (planColor === 'MUTED') {
      status = 'NEUTRAL';
      reason = 'Sin catalizador claro · operar niveles';
    } else if (planColor === 'BULL' && priceDir === 'UP') {
      status = 'CONFIRMACIÓN';
      reason = `Precio ${pct.toFixed(2)}% + flujo BULL alineado`;
    } else if (planColor === 'BEAR' && priceDir === 'DOWN') {
      status = 'CONFIRMACIÓN';
      reason = `Precio ${pct.toFixed(2)}% + flujo BEAR alineado`;
    } else if (planColor === 'BULL' && priceDir === 'DOWN') {
      status = 'DIVERGENCIA';
      reason = `Precio ${pct.toFixed(2)}% pero flujo BULL — posible fade o rezago`;
    } else if (planColor === 'BEAR' && priceDir === 'UP') {
      status = 'DIVERGENCIA';
      reason = `Precio +${pct.toFixed(2)}% pese a flujo BEAR — vigilar reversión`;
    } else {
      status = 'NEUTRAL';
      reason = `Precio ${pct.toFixed(2)}% sin dirección clara`;
    }

    return { key: q.key, label: q.label, changePct: q.changePct, priceDir, planBias: planColor, status, reason };
  });

  // Divergencias explícitas
  const divergences = alignment.filter(a => a.status === 'DIVERGENCIA');
  const confirmations = alignment.filter(a => a.status === 'CONFIRMACIÓN');

  // Recomendación
  let recommendation: string;
  if (overallBias === 'BEAR') {
    const confirmedShorts = confirmations.filter(a => a.planBias === 'BEAR').map(a => a.label).join(', ');
    recommendation = `Sesgo general DEFENSIVO (${bearCount} señales BEAR, ${altoCount} ALTO impacto). ` +
      (confirmedShorts ? `Priorizar shorts en ${confirmedShorts} (precio confirma flujo). ` : '') +
      `Evitar longs contra el flow. ` +
      (divergences.length ? `Vigilar divergencias en ${divergences.map(d => d.label).join(', ')} como potenciales fades.` : '');
  } else if (overallBias === 'BULL') {
    const confirmedLongs = confirmations.filter(a => a.planBias === 'BULL').map(a => a.label).join(', ');
    recommendation = `Sesgo general OFENSIVO (${bullCount} señales BULL, ${altoCount} ALTO impacto). ` +
      (confirmedLongs ? `Priorizar longs en ${confirmedLongs}. ` : '') +
      `Buscar pullbacks a VWAP o breakouts confirmados. ` +
      (divergences.length ? `Divergencias en ${divergences.map(d => d.label).join(', ')} — cuidado con rezagos.` : '');
  } else {
    recommendation = `Sin dirección clara (${bullCount}↑ vs ${bearCount}↓). Operar niveles, evitar operativa direccional agresiva. ` +
      `Esperar próximo catalizador. Los instrumentos con mejor setup ahora son los que muestran CONFIRMACIÓN precio+flujo.`;
  }

  return {
    netScore, overallBias, bullCount, bearCount, altoCount,
    catalysts, alignment, divergences, confirmations, recommendation,
  };
}

export function MacroBrief({ news, social, quotes, plans, lastRefresh }: Props) {
  const brief = useMemo(() => computeBrief(news, social, quotes, plans), [news, social, quotes, plans]);
  const loading = !news || !quotes || !plans;

  const biasStyles = {
    BULL:  { border: 'border-bull/60',  text: 'text-bull',  bg: 'bg-bull/10',  label: 'ALCISTA'  },
    BEAR:  { border: 'border-bear/60',  text: 'text-bear',  bg: 'bg-bear/10',  label: 'BAJISTA'  },
    MIXTO: { border: 'border-warn/60',  text: 'text-warn',  bg: 'bg-warn/10',  label: 'MIXTO'    },
  } as const;
  const bs = biasStyles[brief.overallBias];

  if (loading) {
    return <div className="bg-panel border border-border rounded-lg p-4 h-40 animate-pulse" />;
  }

  return (
    <div className={`bg-panel border ${bs.border} rounded-lg overflow-hidden`}>
      <div className="px-4 py-2 border-b border-border bg-panel2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xs uppercase text-muted font-mono tracking-wider">
            Interpretación Macro <span className="text-accent">·</span> síntesis del flujo
          </h2>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${bs.bg} ${bs.border} ${bs.text} uppercase`}>
            Sesgo {bs.label} · score {brief.netScore > 0 ? '+' : ''}{Math.round(brief.netScore)}
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted">
          {brief.bullCount}↑ / {brief.bearCount}↓ · {brief.altoCount} ALTO impacto
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
        {/* Columna 1 · Catalizadores clave */}
        <div className="p-3 border-b lg:border-b-0 lg:border-r border-border">
          <div className="text-[10px] uppercase text-muted font-mono mb-2">Catalizadores del día · alto impacto</div>
          {brief.catalysts.length === 0 ? (
            <div className="text-xs text-muted italic py-2">Sin catalizadores alto impacto en el flujo actual.</div>
          ) : (
            <ul className="space-y-1.5">
              {brief.catalysts.slice(0, 4).map((c, i) => (
                <li key={i} className="text-[11px] leading-snug">
                  <div className="flex gap-1.5 items-start">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${c.bias === 'BULL' ? 'bg-bull' : 'bg-bear'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-text/90 line-clamp-2">{c.title}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[9px] text-muted font-mono">{c.source}</span>
                        {c.tags.map(t => (
                          <span key={t} className="text-[9px] font-mono text-accent border border-accent/30 rounded px-1">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Columna 2 · Alineación precio-noticias por instrumento */}
        <div className="p-3 border-b lg:border-b-0 lg:border-r border-border">
          <div className="text-[10px] uppercase text-muted font-mono mb-2">Alineación precio ↔ flujo · por instrumento</div>
          <ul className="space-y-1">
            {brief.alignment.map(a => {
              const arrow = a.priceDir === 'UP' ? '▲' : a.priceDir === 'DOWN' ? '▼' : '·';
              const pctColor = a.priceDir === 'UP' ? 'text-bull' : a.priceDir === 'DOWN' ? 'text-bear' : 'text-muted';
              const statusStyle =
                a.status === 'CONFIRMACIÓN' ? 'text-bull border-bull/40 bg-bull/10' :
                a.status === 'DIVERGENCIA'  ? 'text-warn border-warn/40 bg-warn/10' :
                a.status === 'EVENTO'       ? 'text-accent border-accent/40 bg-accent/10' :
                                              'text-muted border-border bg-panel2';
              return (
                <li key={a.key} className="text-[11px] font-mono">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-text/90 truncate">{a.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={pctColor}>{arrow} {a.changePct != null ? Math.abs(a.changePct).toFixed(2) : '—'}%</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${statusStyle}`}>{a.status}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted/80 mt-0.5 leading-snug pl-0">{a.reason}</div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Columna 3 · Recomendación operativa */}
        <div className="p-3">
          <div className="text-[10px] uppercase text-muted font-mono mb-2">Recomendación operativa</div>
          <div className={`text-xs leading-relaxed ${bs.text} font-semibold mb-1`}>
            {brief.overallBias === 'BULL' ? 'Sesgo comprador confirmado' :
             brief.overallBias === 'BEAR' ? 'Sesgo vendedor confirmado' :
             'Rango — sin dirección definida'}
          </div>
          <p className="text-[11px] text-text/80 leading-snug">{brief.recommendation}</p>

          {brief.divergences.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <div className="text-[10px] uppercase text-warn font-mono mb-1">⚠ Divergencias detectadas</div>
              <ul className="text-[10px] text-warn/90 space-y-0.5">
                {brief.divergences.map(d => (
                  <li key={d.key}>· <span className="font-semibold">{d.label}</span>: {d.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
