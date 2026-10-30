'use client';
import type { Impact, Bias } from '@/lib/preaperturaTypes';

export function ImpactBadge({ impact }: { impact: Impact }) {
  const styles = {
    ALTO:  'bg-bear/20 text-bear border-bear/40',
    MEDIO: 'bg-warn/20 text-warn border-warn/40',
    BAJO:  'bg-muted/20 text-muted border-muted/40',
  } as const;
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded ${styles[impact]}`}>
      {impact}
    </span>
  );
}

export function BiasBadge({ bias }: { bias: Bias }) {
  const styles: Record<Bias, string> = {
    BULL:   'bg-bull/20 text-bull border-bull/40',
    BEAR:   'bg-bear/20 text-bear border-bear/40',
    MIXTO:  'bg-warn/20 text-warn border-warn/40',
    NEUTRO: 'bg-muted/20 text-muted border-muted/40',
  };
  const arrow = { BULL: '▲', BEAR: '▼', MIXTO: '◆', NEUTRO: '·' }[bias];
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded ${styles[bias]}`}>
      {arrow} {bias}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-panel2 text-accent border border-border rounded">
      {children}
    </span>
  );
}
