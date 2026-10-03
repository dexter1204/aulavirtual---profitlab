// En export estático servido bajo una subcarpeta (basePath) y con
// trailingSlash, usePathname() devuelve la ruta CON el prefijo y CON barra
// final (p.ej. /aulavirtual/login/). Normalizamos a la forma canónica
// (sin prefijo y sin barra final) para que las comprobaciones funcionen.
export const BASE_PATH = '/aulavirtual';

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
