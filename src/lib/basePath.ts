// En export estático servido bajo una subcarpeta (basePath), usePathname()
// puede devolver la ruta CON el prefijo (/aulavirtual/...). Normalizamos para
// que las comprobaciones de ruta funcionen igual con o sin prefijo.
export const BASE_PATH = '/aulavirtual';

export function stripBase(pathname: string): string {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    const rest = pathname.slice(BASE_PATH.length);
    return rest === '' ? '/' : rest;
  }
  return pathname || '/';
}
