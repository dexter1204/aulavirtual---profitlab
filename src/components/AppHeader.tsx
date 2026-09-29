'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogoMark, LogoWordmark } from './Logo';

export function AppHeader() {
  const { profile, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const initials = (profile?.name ?? 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleBadge = isAdmin
    ? { label: 'MASTER', color: '#C7F94C' }
    : { label: 'ALUMNO', color: '#94A3B8' };

  return (
    <header style={styles.header}>
      <Link href="/cursos" style={styles.brandRow}>
        <LogoMark size={26} />
        <LogoWordmark />
        <span style={styles.tag}>Aula</span>
      </Link>

      <div style={styles.right}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen((v) => !v)} style={styles.avatarBtn}>
            <div style={styles.avatar}>{initials}</div>
            <div style={styles.userInfo}>
              <div style={styles.userName}>{profile?.name?.split(' ')[0] ?? 'Usuario'}</div>
              <div style={{ ...styles.userRole, color: roleBadge.color }}>★ {roleBadge.label}</div>
            </div>
            <span style={styles.chevron}>▾</span>
          </button>

          {open && (
            <>
              <div onClick={() => setOpen(false)} style={styles.overlay} />
              <div style={styles.dropdown}>
                <Link href="/mis-cursos" style={styles.dropItem} onClick={() => setOpen(false)}>
                  🎓 Mis cursos
                </Link>
                <Link href="/cursos" style={styles.dropItem} onClick={() => setOpen(false)}>
                  📚 Catálogo
                </Link>
                <Link href="/perfil" style={styles.dropItem} onClick={() => setOpen(false)}>
                  👤 Mi perfil
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    style={{ ...styles.dropItem, color: '#C7F94C' }}
                    onClick={() => setOpen(false)}
                  >
                    ⚙ Panel Master Study
                  </Link>
                )}
                <div style={styles.divider} />
                <button
                  onClick={() => {
                    setOpen(false);
                    logout().then(() => router.push('/login'));
                  }}
                  style={styles.dropItemDanger}
                >
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#0A0B0E',
    borderBottom: '1px solid #1F222B',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' },
  tag: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 1,
    border: '1px solid #1F222B',
    borderRadius: 6,
    padding: '2px 6px',
    textTransform: 'uppercase',
  },
  right: { display: 'flex', alignItems: 'center', gap: 16 },
  avatarBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: '1px solid #1F222B',
    borderRadius: 10,
    padding: '5px 10px 5px 5px',
    cursor: 'pointer',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#C7F94C',
    color: '#0A0B0E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    fontSize: 12,
  },
  userInfo: { textAlign: 'left' },
  userName: { color: '#F1F5F9', fontSize: 11, fontWeight: 500, lineHeight: '14px' },
  userRole: { fontSize: 9, fontWeight: 500, letterSpacing: 0.4, lineHeight: '11px' },
  chevron: { color: '#94A3B8', fontSize: 10 },
  overlay: { position: 'fixed', inset: 0, zIndex: 60 },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 200,
    backgroundColor: '#14161C',
    border: '1px solid #1F222B',
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 70,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  dropItem: {
    display: 'block',
    padding: '11px 14px',
    color: '#F1F5F9',
    fontSize: 12,
    textDecoration: 'none',
    borderBottom: '1px solid #1F222B',
  },
  divider: { height: 1, backgroundColor: '#1F222B' },
  dropItemDanger: {
    display: 'block',
    width: '100%',
    padding: '11px 14px',
    color: '#FCA5A5',
    fontSize: 12,
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
