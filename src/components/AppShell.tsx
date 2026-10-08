'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { LogoMark } from './Logo';
import { stripBase } from '@/lib/basePath';

// Rutas accesibles sin sesión
const PUBLIC_PATHS = ['/login', '/signup'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const pathname = stripBase(rawPathname);
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

  // Ancho del contenedor según la pantalla:
  //  · catálogo y "mis cursos" usan rejilla → aprovechan más ancho en tablet/desktop
  //  · la ficha de curso usa dos columnas
  //  · el resto (lectura/formularios) se mantiene angosto para buena legibilidad
  const maxWidth =
    pathname === '/curso'
      ? 1040
      : pathname === '/cursos' || pathname === '/mis-cursos' || pathname === '/mercados'
      ? 1120
      : 760;

  return (
    <>
      <AppHeader />
      <main
        style={{
          maxWidth,
          margin: '0 auto',
          // Deja espacio para la barra inferior fija (y el área segura del móvil).
          paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {children}
      </main>
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
