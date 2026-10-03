'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { stripBase } from '@/lib/basePath';

const tabs = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/cursos', label: 'Cursos' },
  { href: '/admin/estudiantes', label: 'Alumnos' },
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
            style={{
              ...styles.tab,
              backgroundColor: active ? '#C7F94C' : '#14161C',
              color: active ? '#0A0B0E' : '#94A3B8',
              borderColor: active ? '#C7F94C' : '#1F222B',
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
  wrap: { display: 'flex', gap: 8, marginBottom: 20 },
  tab: {
    flex: 1,
    textAlign: 'center',
    border: '1px solid',
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  },
};
