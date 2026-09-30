'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { stripBase } from '@/lib/basePath';

export function BottomNav() {
  const pathname = stripBase(usePathname());
  const { isAdmin } = useAuth();

  const isActive = (path: string) => {
    if (path === '/cursos') return pathname === '/cursos' || pathname.startsWith('/cursos/');
    return pathname === path || pathname.startsWith(path + '/');
  };

  const items: { href: string; label: string; icon: IconType }[] = [
    { href: '/cursos', label: 'Catálogo', icon: 'catalog' },
    { href: '/mis-cursos', label: 'Mis cursos', icon: 'learning' },
    ...(isAdmin ? [{ href: '/admin', label: 'Master', icon: 'admin' as IconType }] : []),
    { href: '/perfil', label: 'Perfil', icon: 'profile' },
  ];

  return (
    <nav style={styles.nav}>
      <div style={{ ...styles.container, gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <Link key={it.href} href={it.href} style={styles.item}>
              <Icon type={it.icon} active={active} />
              <span
                style={{
                  ...styles.label,
                  color: active ? '#C7F94C' : '#94A3B8',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {it.label}
              </span>
              {active && <span style={styles.indicator} />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconType = 'catalog' | 'learning' | 'admin' | 'profile';

function Icon({ type, active }: { type: IconType; active: boolean }) {
  const color = active ? '#C7F94C' : '#94A3B8';
  const s = active ? 2.2 : 1.8;
  const fill = active ? color : 'none';
  const fo = active ? 0.15 : 0;

  if (type === 'catalog') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="7" height="7" rx="1.5" stroke={color} strokeWidth={s} fill={fill} fillOpacity={fo} />
        <rect x="14" y="4" width="7" height="7" rx="1.5" stroke={color} strokeWidth={s} fill={fill} fillOpacity={fo} />
        <rect x="3" y="15" width="7" height="5" rx="1.5" stroke={color} strokeWidth={s} fill={fill} fillOpacity={fo} />
        <rect x="14" y="15" width="7" height="5" rx="1.5" stroke={color} strokeWidth={s} fill={fill} fillOpacity={fo} />
      </svg>
    );
  }
  if (type === 'learning') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M12 4L2 8l10 4 8-3.2V15" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" fill={fill} fillOpacity={fo} />
        <path d="M6 11.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4.5" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'admin') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth={s} fill={fill} fillOpacity={fo} />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" stroke={color} strokeWidth={s} strokeLinecap="round" />
      </svg>
    );
  }
  // profile
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={color} strokeWidth={s} fill={fill} fillOpacity={fo} />
      <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke={color} strokeWidth={s} strokeLinecap="round" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 11, 14, 0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid #1F222B',
    zIndex: 100,
    paddingBottom: 'env(safe-area-inset-bottom, 0)',
  },
  container: { maxWidth: 760, margin: '0 auto', display: 'grid', height: 60 },
  item: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    textDecoration: 'none',
  },
  label: { fontSize: 10, letterSpacing: 0.3 },
  indicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 28,
    height: 3,
    backgroundColor: '#C7F94C',
    borderRadius: '0 0 3px 3px',
    boxShadow: '0 0 12px rgba(199, 249, 76, 0.5)',
  },
};
