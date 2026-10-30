'use client';
import { ImpactBadge } from './Badge';

type Ev = { time: string; title: string; impact: 'ALTO' | 'MEDIO' | 'BAJO'; day: string };

export function CalendarPanel({ today, todayEvents, weekly }: { today: string; todayEvents: Ev[]; weekly: Ev[] }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase text-muted font-mono tracking-wider">Calendario económico</h3>
        <span className="text-[10px] text-muted font-mono">Hoy: {today}</span>
      </div>
      <div className="mb-3">
        <div className="text-[10px] uppercase text-accent font-mono mb-1">Hoy</div>
        {todayEvents.length === 0 ? (
          <div className="text-xs text-muted italic">Sin eventos macro típicos programados.</div>
        ) : (
          <ul className="space-y-1">
            {todayEvents.map((e, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-muted min-w-[70px]">{e.time}</span>
                <ImpactBadge impact={e.impact} />
                <span className="text-text/90 flex-1">{e.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="text-[10px] uppercase text-muted font-mono mb-1">Semana completa</div>
        <ul className="space-y-1 max-h-56 overflow-y-auto scrollbar pr-1">
          {weekly.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px]">
              <span className="font-mono text-muted min-w-[30px]">{e.day}</span>
              <span className="font-mono text-muted min-w-[60px]">{e.time}</span>
              <ImpactBadge impact={e.impact} />
              <span className="text-text/70 flex-1">{e.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
