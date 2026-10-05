// Íconos SVG (estilo Lucide) — trazo currentColor. Sin emojis.
import React from 'react';
import type { Material } from '@/lib/api';

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
export const IconUser = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
  </svg>
);
export const IconGraduation = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M22 9 12 4 2 9l10 5 10-5z" />
    <path d="M6 11.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4.5" />
  </svg>
);
export const IconGrid = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
export const IconSettings = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
export const IconChevronDown = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconTrash = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
export const IconPencil = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
);
export const IconDocument = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h8M8 17h8M8 9h2" />
  </svg>
);
export const IconInbox = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5a2 2 0 0 0-1.8-1H7.3a2 2 0 0 0-1.8 1z" />
  </svg>
);
export const IconLink = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
  </svg>
);
export const IconImage = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="1.6" />
    <path d="m21 15-4.5-4.5L6 21" />
  </svg>
);
export const IconMusic = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
export const IconArchive = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
    <path d="M10 12h4" />
  </svg>
);
export const IconEye = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconMail = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </svg>
);
export const IconUpload = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 9l5-5 5 5" />
    <path d="M12 4v12" />
  </svg>
);
export const IconDownload = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);
export const IconExternal = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </svg>
);
export const IconPaperclip = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <path d="M21 8.5 11.5 18a4 4 0 0 1-5.7-5.7l9-9a2.6 2.6 0 0 1 3.7 3.7l-9 9a1.3 1.3 0 0 1-1.8-1.8l8-8" />
  </svg>
);
export const IconClipboard = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 12h6M9 16h6" />
  </svg>
);
export const IconInfo = ({ size, color, style, strokeWidth }: P) => (
  <svg {...base(size, color, strokeWidth, style)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
export const IconDot = ({ size, color, style }: P) => (
  <svg width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" style={style}>
    <circle cx="12" cy="12" r="5" fill={color ?? 'currentColor'} />
  </svg>
);

/** Ícono SVG según el tipo de material (reemplaza los emojis anteriores). */
export function MaterialIcon({ m, size = 16, color = '#C7F94C' }: { m: Pick<Material, 'kind' | 'title' | 'mime' | 'url'>; size?: number; color?: string }) {
  if (m.kind === 'link') {
    const u = (m.url || '').toLowerCase();
    if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm/.test(u)) return <IconVideo size={size} color={color} />;
    return <IconLink size={size} color={color} />;
  }
  const ext = (m.title.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return <IconImage size={size} color={color} />;
  if (['zip', 'rar', '7z'].includes(ext)) return <IconArchive size={size} color={color} />;
  if (['mp4', 'webm', 'mov'].includes(ext)) return <IconVideo size={size} color={color} />;
  if (['mp3', 'wav', 'ogg'].includes(ext)) return <IconMusic size={size} color={color} />;
  return <IconDocument size={size} color={color} />;
}
