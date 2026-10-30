'use client';
import { useEffect } from 'react';
import type { PlanRow } from './PlanCard';
import { LightweightChart } from './LightweightChart';

const SYMBOL_MAP: Record<string, string> = {
  NQ: 'NQ=F', YM: 'YM=F', ES: 'ES=F', RTY: 'RTY=F', GC: 'GC=F', CL: 'CL=F',
};

function fmtLevel(v: number): string {
  const d = v >= 1000 ? 0 : v >= 100 ? 1 : v >= 10 ? 2 : 3;
  return v.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function PlanModal({ row, onClose }: { row: PlanRow; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const p = row.plan;
  const symbol = SYMBOL_MAP[row.index] ?? 'ES=F';
  const color = p.color === 'bull' ? 'text-bull' : p.color === 'bear' ? 'text-bear' : p.color === 'warn' ? 'text-warn' : 'text-muted';
  const borderCol = p.color === 'bull' ? 'border-bull/50' : p.color === 'bear' ? 'border-bear/50' : p.color === 'warn' ? 'border-warn/50' : 'border-border';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
         onClick={onClose}>
      <div className={`bg-panel border ${borderCol} rounded-lg w-full max-w-[1500px] h-[90vh] flex flex-col overflow-hidden`}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel2">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-mono font-semibold text-text truncate">{row.label}</h2>
            <span className={`text-sm font-mono ${color} truncate`}>{p.headline}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-mono text-muted hidden md:inline">
              {row.stats.relevantCount} señales · <span className="text-bull">{row.stats.bull}↑</span> / <span className="text-bear">{row.stats.bear}↓</span>
            </span>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded border border-border bg-panel hover:bg-border transition text-text">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Chart */}
          <div className="flex-1 min-h-[400px] bg-panel2">
            <LightweightChart symbol={symbol} levels={p.levels} setup={p.setup} />
          </div>

          {/* Panel derecho */}
          <aside className="w-full md:w-[360px] border-l border-border bg-panel flex flex-col overflow-y-auto scrollbar">
            <div className="p-4 space-y-4">

              <p className="text-xs text-text/80 leading-relaxed">{p.detail}</p>

              {p.setup && p.setup.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] uppercase text-muted font-mono mb-2">Setup en chart</div>
                  <div className="space-y-1">
                    {p.setup.map((s, i) => {
                      const color = s.kind === 'entry' ? 'text-accent' : s.kind === 'stop' ? 'text-bear' : 'text-bull';
                      const dot   = s.kind === 'entry' ? 'bg-accent'   : s.kind === 'stop' ? 'bg-bear'   : 'bg-bull';
                      return (
                        <div key={i} className="flex items-center justify-between text-[11px] font-mono py-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${dot}`} />
                            <span className={color}>{s.label}</span>
                          </span>
                          <span className={`${color} font-semibold`}>{fmtLevel(s.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(p.entry || p.stop || (p.targets && p.targets.length > 0)) && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="text-[10px] uppercase text-muted font-mono">Racional</div>
                  {p.entry && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-mono text-accent min-w-[52px] uppercase pt-0.5">Entry</span>
                      <span className="text-[11px] text-text/90 leading-snug flex-1">{p.entry}</span>
                    </div>
                  )}
                  {p.stop && (
                    <div className="flex gap-2">
                      <span className="text-[10px] font-mono text-bear min-w-[52px] uppercase pt-0.5">Stop</span>
                      <span className="text-[11px] text-text/90 leading-snug flex-1">{p.stop}</span>
                    </div>
                  )}
                  {p.targets?.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-[10px] font-mono text-bull min-w-[52px] uppercase pt-0.5">Target</span>
                      <span className="text-[11px] text-text/90 leading-snug flex-1">{t}</span>
                    </div>
                  ))}
                </div>
              )}

              {p.levels && p.levels.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] uppercase text-muted font-mono mb-2">Niveles técnicos</div>
                  <div className="space-y-1">
                    {p.levels.map((l, i) => {
                      const isCurrent = l.label === 'Precio actual';
                      const isVwap    = l.label === 'VWAP';
                      const isHigh    = /Máx/.test(l.label);
                      const isLow     = /Mín/.test(l.label);
                      const cls = isCurrent ? 'text-accent font-semibold'
                                : isVwap    ? 'text-warn'
                                : isHigh    ? 'text-bear/90'
                                : isLow     ? 'text-bull/90'
                                : 'text-text/80';
                      return (
                        <div key={i} className="flex items-center justify-between text-[11px] font-mono py-0.5 border-b border-border/40 last:border-b-0">
                          <span className="text-muted text-[10px]">{l.label}</span>
                          <span className={cls}>{fmtLevel(l.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {p.invalidations.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="text-[10px] uppercase text-muted font-mono mb-1">Invalidaciones</div>
                  <ul className="text-[11px] text-text/70 list-disc list-inside space-y-0.5">
                    {p.invalidations.map((v, i) => <li key={i}>{v}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
