import type { ProductKey } from './api';

// Metadatos de los 4 productos del ecosistema para el shell (hub, mi-acceso).
// Colores de identidad validados (dataviz, modo oscuro). La lima (#C7F94C)
// queda reservada para la voz de la app (marca, CTA, nav activa), no para
// identificar productos.
export type ProductMeta = {
  key: 'aula' | ProductKey;
  name: string;
  desc: string;
  color: string;
  href: string;
  premium: boolean; // false = base (siempre accesible)
};

export const PRODUCTS: ProductMeta[] = [
  { key: 'aula',    name: 'Aula Virtual', desc: 'Cursos',                 color: '#C78A2A', href: '/cursos',   premium: false },
  { key: 'signals', name: 'Señales',      desc: 'Trading en vivo',        color: '#22B468', href: '/senales',  premium: true },
  { key: 'news',    name: 'Pre-Apertura', desc: 'Plan del día · US',      color: '#4F86F7', href: '/mercados?tab=preapertura', premium: true },
  { key: 'quant',   name: 'Quant',        desc: 'Gamma & flow de dealers', color: '#DE6BBE', href: '/mercados?tab=exposiciones', premium: true },
];
