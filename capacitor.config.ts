import type { CapacitorConfig } from '@capacitor/cli';

// ─────────────────────────────────────────────────────────────
// Configuración de la app nativa (Android / iOS) con Capacitor.
// Empaqueta el export estático de Next (carpeta ./out) dentro de
// un WebView nativo. Se construye con `npm run build:app`.
// ─────────────────────────────────────────────────────────────
const config: CapacitorConfig = {
  appId: 'com.profitlabacademy.aula',
  appName: 'ProfitLab Academy',
  webDir: 'out',
  backgroundColor: '#0A0B0E',
  android: {
    // Esquema https para el WebView de Android (necesario para que la
    // app haga peticiones a la API por https sin bloqueos de contenido mixto).
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
    // Enruta window.fetch/XMLHttpRequest por HTTP NATIVO (no por el WebView).
    // Evita CORS y la cabecera Origin (que el WAF de SiteGround puede bloquear),
    // así el login y las llamadas a la API funcionan desde la app.
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0A0B0E',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0B0E',
    },
  },
};

export default config;
