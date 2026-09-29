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

export const metadata: Metadata = {
  title: 'Profit Lab · Aula Virtual',
  description: 'Aula virtual de Profit Lab Academy — cursos de trading en video.',
  openGraph: {
    title: 'Profit Lab · Aula Virtual',
    description: 'Cursos de trading de Profit Lab Academy.',
    siteName: 'Profit Lab Academy',
    locale: 'es_PE',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0B0E',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${bricolage.variable} ${manrope.variable}`}>
      <body
        className="bg-[#0A0B0E] text-[#F1F5F9] min-h-screen"
        style={{ fontFamily: 'var(--font-manrope), -apple-system, sans-serif', paddingBottom: 60 }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
