'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { stripBase, SUPERAPP, HOME_ROUTE } from '@/lib/basePath';
import { hSelection } from '@/lib/haptics';
import { LogoMark, LogoWordmark } from './Logo';

export function BottomNav() {
  const pathname = stripBase(usePathname());
  const { isAdmin } = useAuth();

  const isActive = (path: string) => {
    if (path === '/cursos') return pathname === '/cursos' || pathname.startsWith('/cursos/');
    return pathname === path || pathname.startsWith(path + '/');
  };

  const items: { href: string; label: string; icon: IconType }[] = [
    ...(SUPERAPP ? [{ href: '/inicio', label: 'Inicio', icon: 'home' as IconType }] : []),
    { href: '/cursos', label: 'Catálogo', icon: 'catalog' },
    { href: '/mis-cursos', label: 'Mis cursos', icon: 'learning' },
    // Las tareas ya no viven en el menú: aparecen dentro de cada curso
    // (ver aprender/page.tsx → <StudentAssignments hideWhenEmpty />) y solo
    // cuando ese curso tiene tareas asignadas.
    // Mercados y Señales solo en el super-app; el aula puro es solo cursos.
    ...(SUPERAPP ? [
      { href: '/mercados', label: 'Mercados', icon: 'markets' as IconType },
      { href: '/senales', label: 'Señales', icon: 'signals' as IconType },
    ] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Master', icon: 'admin' as IconType }] : []),
    { href: '/perfil', label: 'Perfil', icon: 'profile' },
  ];

  return (
    <nav className="pl-nav pl-tabbar" aria-label="Navegación principal">
      {/* Marca · solo visible como cabecera del sidebar en escritorio */}
      <Link href={HOME_ROUTE} className="pl-sidebar-brand pl-pressable">
        <LogoMark size={24} />
        <LogoWordmark size={16} />
      </Link>

      <div className="pl-tabinner">
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className="pl-pressable pl-tabitem"
              data-active={active}
              aria-current={active ? 'page' : undefined}
              onPointerDown={() => { if (!active) hSelection(); }}
            >
              <span
                className="pl-tabicon"
                style={{ transform: active ? 'translateY(-1px) scale(1.06)' : 'none' }}
              >
                <Icon type={it.icon} active={active} />
              </span>
              <span
                className="pl-tablabel"
                style={{
                  color: active ? '#C7F94C' : '#94A3B8',
                  fontWeight: active ? 700 : 500,
                }}
              >
                {it.label}
              </span>
              {active && <span className="pl-tabindicator" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

type IconType = 'home' | 'catalog' | 'learning' | 'tasks' | 'markets' | 'signals' | 'admin' | 'profile';

function Icon({ type, active }: { type: IconType; active: boolean }) {
  const color = active ? '#C7F94C' : '#94A3B8';
  const s = active ? 2.2 : 1.8;
  const fill = active ? color : 'none';
  const fo = active ? 0.15 : 0;

  if (type === 'home') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 11l8-7 8 7" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 10v9h12v-9" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" fill={fill} fillOpacity={fo} />
      </svg>
    );
  }
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
  if (type === 'tasks') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="8" y="3" width="8" height="4" rx="1" stroke={color} strokeWidth={s} fill={fill} fillOpacity={fo} />
        <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'markets') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M4 20V10M9 20V4M14 20v-7M19 20V8" stroke={color} strokeWidth={s} strokeLinecap="round" />
        <path d="M3 20h18" stroke={color} strokeWidth={s} strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'signals') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M3 17l5-5 3 3 6-7" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 8h4v4" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
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

