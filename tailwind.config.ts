import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:           '#0A0B0E',
        surface:      '#14161C',
        surfaceHi:    '#1A1D26',
        border:       '#1F222B',
        borderHi:     '#262932',
        text:         '#F1F5F9',
        textMuted:    '#94A3B8',
        textDim:      '#64748B',
        primary:      '#C7F94C',
        long:         '#22C55E',
        longText:     '#86EFAC',
        short:        '#EF4444',
        shortText:    '#FCA5A5',
        warning:      '#F59E0B',
        warningText:  '#FCD34D',
      },
    },
  },
  plugins: [],
};

export default config;
