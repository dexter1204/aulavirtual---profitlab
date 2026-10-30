'use client';
import { ImpactBadge, BiasBadge, Tag } from './Badge';
import type { Classification } from '@/lib/preaperturaTypes';

export type NewsItem = {
  id: string;
  source: string;
  category: string;
  title: string;
  link: string;
  publishedAt: string;
  summary?: string;
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

export function NewsList({ items, filter }: { items: NewsItem[]; filter?: 'ALL' | 'ALTO' | 'BULL' | 'BEAR' }) {
  const filtered = items.filter(i => {
    if (!filter || filter === 'ALL') return true;
    if (filter === 'ALTO') return i.classification.impact === 'ALTO';
    return i.classification.bias === filter;
  });
  if (filtered.length === 0) {
    return <div className="p-4 text-center text-muted text-sm">Sin resultados para el filtro seleccionado.</div>;
  }
  return (
    <ul className="divide-y divide-border">
      {filtered.map(item => (
        <li key={item.id} className="p-3 hover:bg-panel2 transition">
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 min-w-[64px]">
              <ImpactBadge impact={item.classification.impact} />
              <BiasBadge bias={item.classification.bias} />
            </div>
            <div className="flex-1 min-w-0">
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm text-text hover:text-accent leading-snug block">
                {item.title}
              </a>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] text-muted font-mono">{item.source}</span>
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
      ))}
    </ul>
  );
}
