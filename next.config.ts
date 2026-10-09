import type { NextConfig } from 'next';

// ─────────────────────────────────────────────────────────────
// basePath configurable según el destino del build:
//
//   • WEB (SiteGround, subcarpeta):  /aulavirtual   (valor por defecto)
//   • APP NATIVA (Capacitor):        ''  (la app carga desde la raíz del
//     WebView, así que no debe llevar prefijo)
//
// Se controla con NEXT_PUBLIC_BASE_PATH. Para la app se construye con
// `npm run build:app` (ver package.json), que lo deja vacío y apunta la
// API a la URL absoluta del servidor.
// ─────────────────────────────────────────────────────────────
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/aulavirtual';

const nextConfig: NextConfig = {
  // Exportación estática: genera HTML/JS en ./out para hosting como SiteGround
  // y para empaquetar con Capacitor (webDir: 'out').
  output: 'export',
  basePath: BASE_PATH,
  // Cada ruta se crea como carpeta/index.html (Apache la sirve en /ruta/).
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    // La optimización de imágenes de Next no está disponible en export estático.
    unoptimized: true,
  },
};

export default nextConfig;
