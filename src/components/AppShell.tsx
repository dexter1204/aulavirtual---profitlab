'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { LogoMark } from './Logo';

// Rutas accesibles sin sesión
const PUBLIC_PATHS = ['/login', '/signup'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isLoading, isAdmin } = useAuth();

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isAdminArea = pathname.startsWith('/admin');

  // Guardas de navegación
  useEffect(() => {
    if (isLoading) return;
    if (!session && !isPublic) {
      router.replace('/login');
    } else if (session && isPublic) {
      router.replace('/cursos');
    } else if (session && isAdminArea && !isAdmin) {
      router.replace('/cursos');
    }
  }, [isLoading, session, isPublic, isAdminArea, isAdmin, router]);

  // Pantalla de carga inicial
  if (isLoading) {
    return (
      <div style={styles.loader}>
        <div style={{ animation: 'spin 1.4s linear infinite' }}>
          <LogoMark size={40} />
        </div>
      </div>
    );
  }

  // Páginas públicas (login/signup): sin chrome
  if (isPublic) return <>{children}</>;

  // Si aún no hay sesión (mientras redirige), no mostramos contenido privado
  if (!session) {
    return (
      <div style={styles.loader}>
        <div style={{ animation: 'spin 1.4s linear infinite' }}>
          <LogoMark size={40} />
        </div>
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main style={{ maxWidth: 760, margin: '0 auto' }}>{children}</main>
      <BottomNav />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loader: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
