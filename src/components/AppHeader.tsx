'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogoMark, LogoWordmark } from './Logo';
import { IconGraduation, IconGrid, IconUser, IconSettings, IconChevronDown } from './icons';
import { SUPERAPP, HOME_ROUTE } from '@/lib/basePath';

export function AppHeader() {
  const { profile, isAdmin, logout } = useAuth();
  const router = useRouter();

  // open = intención · visible = estado data-open (dispara la transición)
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (exitTimer.current) clearTimeout(exitTimer.current);
      const r = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(r);
    }
    setVisible(false);
  }, [open]);

  const close = () => {
    setVisible(false);
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setOpen(false), 180);
  };

  const initials = (profile?.name ?? 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleBadge = isAdmin
    ? { label: 'MASTER', color: '#C7F94C' }
    : { label: 'ALUMNO', color: '#9AA6B6' };

  return (
    <header className="pl-header" style={styles.header}>
      <Link href={HOME_ROUTE} className="pl-pressable pl-brandrow" style={styles.brandRow}>
        <LogoMark size={26} />
        <LogoWordmark />
        <span style={styles.tag}>{SUPERAPP ? 'App' : 'Aula'}</span>
      </Link>

      <div style={styles.right}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => (open ? close() : setOpen(true))}
            className="pl-pressable"
            style={styles.avatarBtn}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <div style={styles.avatar}>{initials}</div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{profile?.name?.split(' ')[0] ?? 'Usuario'}</div>
              <div style={{ ...styles.userRole, color: roleBadge.color }}>★ {roleBadge.label}</div>
            </div>
            <span
              style={{
                ...styles.chevron,
                transform: visible ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
              aria-hidden="true"
            >
              <IconChevronDown size={14} color="#9AA6B6" />
            </span>
          </button>

          {open && (
            <>
              <div onClick={close} style={styles.overlay} />
              <div className="pl-pop" data-open={visible} style={styles.dropdown} role="menu">
                <Link href="/mis-cursos" className="pl-dropitem" style={styles.dropItem} onClick={close}>
                  <IconGraduation size={16} color="#9AA6B6" />
                  Mis cursos
                </Link>
                <Link href="/cursos" className="pl-dropitem" style={styles.dropItem} onClick={close}>
                  <IconGrid size={16} color="#9AA6B6" />
                  Catálogo
                </Link>
                <Link href="/perfil" className="pl-dropitem" style={styles.dropItem} onClick={close}>
                  <IconUser size={16} color="#9AA6B6" />
                  Mi perfil
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="pl-dropitem"
                    style={{ ...styles.dropItem, color: '#C7F94C' }}
                    onClick={close}
                  >
                    <IconSettings size={16} color="#C7F94C" />
                    Panel Master Study
                  </Link>
                )}
                <div style={styles.divider} />
                <button
                  onClick={() => {
                    close();
                    logout().then(() => router.push('/login'));
                  }}
                  className="pl-dropitem"
                  style={styles.dropItemDanger}
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .pl-dropitem { transition: background-color var(--dur-fast) var(--ease-out); }
        .pl-dropitem:hover { background-color: var(--surface-hi); }
        .pl-dropitem:active { background-color: var(--border); }
      `}</style>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    paddingTop: 'calc(14px + var(--safe-top))',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', borderRadius: 'var(--r-sm)' },
  tag: {
    color: 'var(--text-muted)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-pill)',
    padding: '2px 8px',
    textTransform: 'uppercase',
  },
  right: { display: 'flex', alignItems: 'center', gap: 16 },
  avatarBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-pill)',
    padding: '5px 12px 5px 5px',
    cursor: 'pointer',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    color: '#0A0B0E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 12,
  },
  userInfo: { textAlign: 'left' },
  userName: { color: 'var(--text)', fontSize: 11.5, fontWeight: 600, lineHeight: '14px' },
  userRole: { fontSize: 9, fontWeight: 600, letterSpacing: 0.4, lineHeight: '11px' },
  chevron: {
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'transform var(--dur-base) var(--ease-out)',
  },
  overlay: { position: 'fixed', inset: 0, zIndex: 60 },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    right: 0,
    width: 210,
    backgroundColor: 'var(--mat-sheet)',
    border: '1px solid var(--border-hi)',
    borderRadius: 'var(--r-md)',
    overflow: 'hidden',
    zIndex: 70,
    boxShadow: 'var(--shadow-pop)',
    ['--pl-origin' as string]: 'top right',
  },
  dropItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    color: 'var(--text)',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    borderBottom: '1px solid var(--border)',
  },
  divider: { height: 1, backgroundColor: 'var(--border)' },
  dropItemDanger: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
