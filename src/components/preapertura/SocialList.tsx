'use client';
import { ImpactBadge, BiasBadge, Tag } from './Badge';
import type { Classification, SocialCategory } from '@/lib/preaperturaTypes';

export type SocialItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  handle?: string;
  category: SocialCategory;
  weight: number;
  title: string;
  text: string;
  link: string;
  publishedAt: string;
  classification: Classification;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - +new Date(iso);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const CAT_STYLES: Record<SocialCategory, { label: string; cls: string }> = {
  'fed-official':   { label: 'FED',      cls: 'text-accent border-accent/40 bg-accent/10' },
  'macro-official': { label: 'MACRO',    cls: 'text-warn border-warn/40 bg-warn/10' },
  'whale-bsky':     { label: 'BLUESKY',  cls: 'text-bull border-bull/40 bg-bull/10' },
  'ticker':         { label: 'STOCKTW',  cls: 'text-text border-border bg-panel2' },
  'options':        { label: 'OPTIONS',  cls: 'text-warn border-warn/40 bg-warn/10' },
  'wsb':            { label: 'WSB',      cls: 'text-bear border-bear/40 bg-bear/10' },
  'stocks':         { label: 'REDDIT',   cls: 'text-muted border-border bg-panel2' },
};

export function SocialList({ items, filter }: { items: SocialItem[]; filter?: string }) {
  const filtered = items.filter(i => {
    if (!filter || filter === 'ALL') return true;
    if (filter === 'HIGH') return i.classification.impact === 'ALTO';
    return i.category === filter;
  });
  if (filtered.length === 0) {
    return <div className="p-4 text-center text-muted text-sm">Sin resultados para el filtro.</div>;
  }
  return (
    <ul className="divide-y divide-border">
      {filtered.map(item => {
        const style = CAT_STYLES[item.category];
        return (
          <li key={item.id} className="p-3 hover:bg-panel2 transition">
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1 min-w-[70px]">
                <span className={`px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded ${style.cls}`}>
                  {style.label}
                </span>
                {item.classification.impact !== 'BAJO' && <ImpactBadge impact={item.classification.impact} />}
                {item.classification.bias !== 'NEUTRO' && <BiasBadge bias={item.classification.bias} />}
              </div>
              <div className="flex-1 min-w-0">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm text-text hover:text-accent leading-snug block font-medium">
                  {item.title}
                </a>
                {item.text && item.text !== item.title && (
                  <p className="text-xs text-text/70 mt-1 line-clamp-3 leading-snug">{item.text.slice(0, 240)}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-mono text-accent">{item.sourceName}</span>
                  <span className="text-[10px] text-muted font-mono">· {timeAgo(item.publishedAt)}</span>
                  {item.classification.tags.slice(0, 3).map(t => <Tag key={t}>{t}</Tag>)}
                  {item.classification.indices.map(k => (
                    <span key={k} className="text-[10px] font-mono text-accent border border-accent/30 rounded px-1">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
