'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { stripBase } from '@/lib/basePath';

const TABS: [string, string][] = [
  ['/senales', 'Señales'],
  ['/senales/proyecciones', 'Proyecciones'],
  ['/senales/conteo', 'Conteo'],
  ['/senales/calculadora', 'Lotaje'],
];

export function SignalsTabs() {
  const path = stripBase(usePathname());
  const isActive = (href: string) =>
    href === '/senales'
      ? path === '/senales' || path.startsWith('/senales/detalle') || path.startsWith('/senales/nueva') || path.startsWith('/senales/editar')
      : path === href || path.startsWith(href + '/');

  return (
    <div style={styles.wrap}>
      {TABS.map(([href, label]) => {
        const active = isActive(href);
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className="pl-pressable" style={{ ...styles.tab, backgroundColor: active ? 'var(--primary)' : 'var(--surface)', color: active ? 'var(--bg)' : 'var(--text-muted)', borderColor: active ? 'var(--primary)' : 'var(--border)', boxShadow: active ? 'var(--shadow-chip)' : 'none' }}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', gap: 6, overflowX: 'auto', margin: '0 0 14px', paddingBottom: 2, scrollbarWidth: 'none' },
  tab: { flex: '0 0 auto', border: '1px solid', borderRadius: 'var(--r-pill)', padding: '8px 15px', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', minHeight: 38, display: 'flex', alignItems: 'center', transition: 'background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)' },
};
