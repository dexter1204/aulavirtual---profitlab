// Íconos SVG (estilo Lucide) — trazo currentColor. Sin emojis.
import React from 'react';

type P = { size?: number; color?: string; style?: React.CSSProperties; strokeWidth?: number };

function base(size = 20, color = 'currentColor', strokeWidth = 1.8, style?: React.CSSProperties) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  };
}

export const IconBook = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
export const IconLayers = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M12 2 2 7l10 5 10-5-10-5z" />
    <path d="m2 17 10 5 10-5" />
    <path d="m2 12 10 5 10-5" />
  </svg>
);
export const IconClock = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconChart = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M3 3v18h18" />
    <rect x="7" y="12" width="3" height="5" />
    <rect x="12" y="8" width="3" height="9" />
    <rect x="17" y="5" width="3" height="12" />
  </svg>
);
export const IconUsers = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
export const IconCard = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);
export const IconAward = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <circle cx="12" cy="8" r="6" />
    <path d="M15.5 12.5 17 22l-5-3-5 3 1.5-9.5" />
  </svg>
);
export const IconDevices = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <rect x="2" y="4" width="14" height="10" rx="1.5" />
    <path d="M2 18h14" />
    <rect x="17" y="8" width="5" height="12" rx="1.5" />
  </svg>
);
export const IconPlay = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)} fill={color ?? 'currentColor'} stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
);
export const IconCheck = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const IconLock = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
export const IconShield = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
export const IconArrowLeft = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);
export const IconArrowRight = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);
export const IconSearch = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
export const IconX = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
export const IconVideo = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="m16 10 4.5-2.6a.6.6 0 0 1 .9.5v8.2a.6.6 0 0 1-.9.5L16 14" />
    <rect x="2.5" y="6" width="13.5" height="12" rx="2.5" />
  </svg>
);
export const IconTag = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L3.6 11.6A2 2 0 0 1 3 10.2V4a1 1 0 0 1 1-1h6.2a2 2 0 0 1 1.4.6z" />
    <circle cx="7.5" cy="7.5" r="1.3" fill={color ?? 'currentColor'} stroke="none" />
  </svg>
);
