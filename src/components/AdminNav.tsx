'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { stripBase, SUPERAPP } from '@/lib/basePath';

const tabs = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/cursos', label: 'Cursos' },
  { href: '/admin/estudiantes', label: 'Alumnos' },
  // Mercados, Señales y Accesos solo aplican al super-app; el aula puro es solo cursos.
  ...(SUPERAPP ? [
    { href: '/admin/mercados', label: 'Mercados' },
    { href: '/admin/senales', label: 'Señales' },
    { href: '/admin/accesos', label: 'Accesos' },
  ] : []),
];

export function AdminNav() {
  const pathname = stripBase(usePathname());
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div style={styles.wrap}>
      {tabs.map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className="pl-pressable"
            style={{
              ...styles.tab,
              backgroundColor: active ? 'var(--primary)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--text-muted)',
              boxShadow: active ? 'var(--shadow-chip)' : 'none',
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    padding: 4,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    boxShadow: 'var(--shadow-card)',
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    border: 'none',
    borderRadius: 'var(--r-sm)',
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
  },
};
