import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Exportación estática: genera HTML/JS en ./out para hosting como SiteGround.
  output: 'export',
  // Cada ruta se crea como carpeta/index.html (Apache la sirve en /ruta/).
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    // La optimización de imágenes de Next no está disponible en export estático.
    unoptimized: true,
  },
};

export default nextConfig;
