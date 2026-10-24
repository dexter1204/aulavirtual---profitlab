'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';
import { LogoMark } from './Logo';
import { stripBase, HOME_ROUTE } from '@/lib/basePath';

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
      router.replace(HOME_ROUTE);
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
  // Ancho del contenedor por pantalla (desktop):
  //  · dashboards/listas/hub aprovechan el ancho (1200 / 1560 Mercados)
  //  · lectura (curso, clase) se acota para legibilidad (1040)
  //  · formularios y detalle quedan en el default angosto (760) — se auto-centran
  const FULL = ['/cursos', '/mis-cursos']; // rejillas de tarjetas → ancho completo del monitor
  const WIDE = ['/inicio', '/senales'];
  const WIDE_LISTS = ['/senales/conteo', '/senales/sesiones', '/senales/proyecciones'];
  const maxWidth: string | number =
    FULL.includes(pathname)
      ? '100%'
      : pathname === '/mercados'
      ? 1560
      : pathname === '/curso' || pathname === '/aprender'
      ? 1040
      : WIDE_LISTS.includes(pathname)
      ? 1120
      : isAdminArea || WIDE.includes(pathname)
      ? 1200
      : 760;

  return (
    <>
      {/* BottomNav: barra inferior en móvil · sidebar izquierdo en escritorio */}
      <BottomNav />
      <div className="pl-content">
        <AppHeader />
        <main
          className="pl-main"
          style={{
            maxWidth,
            margin: '0 auto',
            // Deja espacio para la barra inferior fija (y el área segura del móvil).
            paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {children}
        </main>
      </div>
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
