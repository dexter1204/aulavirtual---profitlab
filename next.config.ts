import type { NextConfig } from 'next';

// Se sirve como subcarpeta del dominio: https://profitlab-academy.com/aulavirtual
const BASE_PATH = '/aulavirtual';

const nextConfig: NextConfig = {
  // Exportación estática: genera HTML/JS en ./out para hosting como SiteGround.
  output: 'export',
  // La app vive bajo /aulavirtual (subcarpeta de public_html).
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
