import type { Material } from '@/lib/api';

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

/** Emoji/icono según el tipo de material. */
export function materialIcon(m: Pick<Material, 'kind' | 'title' | 'mime' | 'url'>): string {
  if (m.kind === 'link') {
    const u = (m.url || '').toLowerCase();
    if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm/.test(u)) return '🎬';
    return '🔗';
  }
  const ext = (m.title.split('.').pop() || '').toLowerCase();
  if (['pdf'].includes(ext)) return '📕';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
  if (['ppt', 'pptx'].includes(ext)) return '📙';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['zip', 'rar'].includes(ext)) return '🗜️';
  if (['mp4', 'webm', 'mov'].includes(ext)) return '🎬';
  if (['mp3', 'wav'].includes(ext)) return '🎵';
  return '📄';
}
