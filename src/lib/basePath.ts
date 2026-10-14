// En export estático servido bajo una subcarpeta (basePath) y con
// trailingSlash, usePathname() devuelve la ruta CON el prefijo y CON barra
// final (p.ej. /aulavirtual/login/). Normalizamos a la forma canónica
// (sin prefijo y sin barra final) para que las comprobaciones funcionen.
// Debe coincidir con el basePath de next.config.ts (web: /aulavirtual, app: '').
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/aulavirtual';

// Modo super-app: cuando se compila con NEXT_PUBLIC_SUPERAPP=1 (destino /app),
// se activa el hub unificado (Inicio, canjear, mi-acceso, admin/accesos). En
// el build por defecto (destino /aulavirtual) queda APAGADO: la app se comporta
// como el Aula Virtual de siempre (entra a cursos, sin hub).
export const SUPERAPP = process.env.NEXT_PUBLIC_SUPERAPP === '1';

// Ruta de inicio según el modo: el hub en super-app, el catálogo en el aula.
export const HOME_ROUTE = SUPERAPP ? '/inicio' : '/cursos';

export function stripBase(pathname: string): string {
  let p = pathname || '/';
  if (BASE_PATH && p.startsWith(BASE_PATH)) {
    p = p.slice(BASE_PATH.length) || '/';
  }
  // Quitar barra(s) final(es), salvo si es la raíz.
  if (p.length > 1) {
    p = p.replace(/\/+$/, '') || '/';
  }
  return p;
}
