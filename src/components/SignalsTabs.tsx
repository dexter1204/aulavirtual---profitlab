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
          <Link key={href} href={href} style={{ ...styles.tab, backgroundColor: active ? '#C7F94C' : '#14161C', color: active ? '#0A0B0E' : '#94A3B8', borderColor: active ? '#C7F94C' : '#1F222B' }}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', gap: 6, overflowX: 'auto', margin: '0 0 14px', paddingBottom: 2, scrollbarWidth: 'none' },
  tab: { flex: '0 0 auto', border: '1px solid', borderRadius: 999, padding: '8px 15px', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', minHeight: 38, display: 'flex', alignItems: 'center' },
};
