'use client';
import type { ActionPlan, Level } from '@/lib/preaperturaTypes';

export type PlanRow = {
  index: string;
  label: string;
  plan: ActionPlan;
  stats: { bull: number; bear: number; highImpactBull: number; highImpactBear: number; relevantCount: number };
};

const border = {
  bull: 'border-bull/50',
  bear: 'border-bear/50',
  warn: 'border-warn/50',
  muted: 'border-border',
} as const;
const headline = {
  bull: 'text-bull',
  bear: 'text-bear',
  warn: 'text-warn',
  muted: 'text-muted',
} as const;

function fmtLevel(v: number): string {
  const d = v >= 1000 ? 0 : v >= 100 ? 1 : v >= 10 ? 2 : 3;
  return v.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function LevelsTable({ levels }: { levels: Level[] }) {
  if (!levels || levels.length === 0) return null;
  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="text-[10px] uppercase text-muted font-mono mb-1">Niveles clave</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono">
        {levels.map((l, i) => {
          const isCurrent = l.label === 'Precio actual';
          const isVwap = l.label === 'VWAP';
          const cls = isCurrent ? 'text-accent font-semibold'
                    : isVwap    ? 'text-warn'
                    : 'text-text/80';
          return (
            <div key={i} className="flex justify-between">
              <span className="text-muted text-[10px]">{l.label}</span>
              <span className={cls}>{fmtLevel(l.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PlanCard({ row, onClick }: { row: PlanRow; onClick?: () => void }) {
  const c = row.plan.color;
  const { plan } = row;
  return (
    <div onClick={onClick}
         className={`bg-panel border ${border[c]} rounded-lg p-3 flex flex-col gap-2 text-xs ${onClick ? 'cursor-pointer hover:bg-panel2 hover:border-accent/50 transition' : ''}`}
         title={onClick ? 'Clic para ver chart en detalle' : undefined}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-mono text-muted uppercase">{row.label}</span>
        <span className="text-[10px] font-mono text-muted">
          {row.stats.relevantCount} · <span className="text-bull">{row.stats.bull}↑</span>/<span className="text-bear">{row.stats.bear}↓</span>
        </span>
      </div>
      <div className={`text-sm font-semibold ${headline[c]} leading-tight`}>{plan.headline}</div>
      <p className="text-[11px] text-text/80 leading-relaxed">{plan.detail}</p>

      {(plan.entry || plan.stop || (plan.targets && plan.targets.length > 0)) && (
        <div className="border-t border-border pt-2 space-y-1">
          {plan.entry && (
            <div className="flex gap-1.5">
              <span className="text-[10px] font-mono text-accent min-w-[42px] uppercase">Entry</span>
              <span className="text-[11px] text-text/90 leading-snug">{plan.entry}</span>
            </div>
          )}
          {plan.stop && (
            <div className="flex gap-1.5">
              <span className="text-[10px] font-mono text-bear min-w-[42px] uppercase">Stop</span>
              <span className="text-[11px] text-text/90 leading-snug">{plan.stop}</span>
            </div>
          )}
          {plan.targets && plan.targets.map((t, i) => (
            <div key={i} className="flex gap-1.5">
              <span className="text-[10px] font-mono text-bull min-w-[42px] uppercase">Target</span>
              <span className="text-[11px] text-text/90 leading-snug">{t}</span>
            </div>
          ))}
        </div>
      )}

      <LevelsTable levels={plan.levels} />

      {plan.invalidations.length > 0 && (
        <div className="mt-1 pt-2 border-t border-border">
          <div className="text-[10px] uppercase text-muted font-mono mb-1">Invalidaciones</div>
          <ul className="text-[10.5px] text-text/70 list-disc list-inside space-y-0.5">
            {plan.invalidations.map((v, i) => <li key={i}>{v}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
