import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Carga optimizada de fuentes Google
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-bricolage',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
});

// Modo super-app (destino /app): el título y los textos de marca cambian de
// "Aula Virtual" a la app unificada. En el build por defecto (/aulavirtual)
// se mantiene el Aula de siempre.
const IS_SUPERAPP = process.env.NEXT_PUBLIC_SUPERAPP === '1';

const BRAND = IS_SUPERAPP
  ? {
      title: 'Profit Lab Academy',
      description: 'Tus productos Profit Lab en una sola app: cursos, Quant, Señales y Pre-Apertura.',
      ogDescription: 'Cursos, Quant, Señales y Pre-Apertura de Profit Lab Academy en una sola app.',
    }
  : {
      title: 'Profit Lab · Aula Virtual',
      description: 'Aula virtual de Profit Lab Academy — cursos de trading en video.',
      ogDescription: 'Cursos de trading de Profit Lab Academy.',
    };

export const metadata: Metadata = {
  title: BRAND.title,
  description: BRAND.description,
  openGraph: {
    title: BRAND.title,
    description: BRAND.ogDescription,
    siteName: 'Profit Lab Academy',
    locale: 'es_PE',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0B0E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  // Ocupar toda la pantalla incluidas las zonas seguras (notch) en app/PWA.
  viewportFit: 'cover',
};

// Prefijo según el destino del build (web: /aulavirtual, app: '').
const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? '/aulavirtual';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${bricolage.variable} ${manrope.variable}`}>
      <head>
        <link rel="manifest" href={`${BP}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${BP}/icons/apple-touch-icon.png`} />
        <link rel="icon" type="image/png" href={`${BP}/icons/icon-192.png`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ProfitLab" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className="bg-[#0A0B0E] text-[#F1F5F9] min-h-screen"
        style={{ fontFamily: 'var(--font-manrope), -apple-system, sans-serif', paddingBottom: 60 }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
