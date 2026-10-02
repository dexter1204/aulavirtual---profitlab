// Utilidades para trabajar con videos de YouTube

/**
 * Extrae el ID de 11 caracteres de un enlace de YouTube en cualquier formato:
 *   https://www.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/shorts/ID
 *   https://www.youtube.com/live/ID
 * También acepta directamente un ID pegado.
 */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null;
  const value = input.trim();

  // ¿Ya es un ID de 11 caracteres?
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

      const parts = url.pathname.split('/').filter(Boolean);
      // /embed/ID · /shorts/ID · /live/ID
      const idx = parts.findIndex((p) => ['embed', 'shorts', 'live', 'v'].includes(p));
      if (idx >= 0 && parts[idx + 1]) {
        const id = parts[idx + 1];
        return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    // no era una URL válida
  }
  return null;
}

export function youTubeThumbnail(youtubeId: string, quality: 'hq' | 'mq' | 'max' = 'hq'): string {
  const file =
    quality === 'max' ? 'maxresdefault' : quality === 'mq' ? 'mqdefault' : 'hqdefault';
  return `https://i.ytimg.com/vi/${youtubeId}/${file}.jpg`;
}

export function youTubeEmbedUrl(youtubeId: string): string {
  return `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`;
}

// ============================================================
// Google Drive
// ============================================================

export type VideoProvider = 'youtube' | 'drive';

/**
 * Extrae el ID de archivo de un enlace de Google Drive en cualquier formato:
 *   https://drive.google.com/file/d/ID/view?usp=sharing
 *   https://drive.google.com/open?id=ID
 *   https://drive.google.com/uc?id=ID&export=download
 *   https://docs.google.com/.../d/ID/edit
 */
export function parseDriveId(input: string): string | null {
  if (!input) return null;
  const value = input.trim();
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'drive.google.com' && host !== 'docs.google.com') return null;

    // /file/d/ID/...  o  /d/ID/...
    const m = url.pathname.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m) return m[1];

    // ?id=ID
    const id = url.searchParams.get('id');
    if (id && /^[a-zA-Z0-9_-]{10,}$/.test(id)) return id;
  } catch {
    // no era una URL válida
  }
  return null;
}

/**
 * Detecta el proveedor (YouTube o Google Drive) a partir de un enlace y
 * devuelve { provider, id }. Devuelve null si no se reconoce.
 */
export function parseVideo(input: string): { provider: VideoProvider; id: string } | null {
  const yt = parseYouTubeId(input);
  if (yt) return { provider: 'youtube', id: yt };
  const dr = parseDriveId(input);
  if (dr) return { provider: 'drive', id: dr };
  return null;
}

/** URL de reproducción embebida de Google Drive (reproductor propio de Drive). */
export function driveEmbedUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/** Miniatura de Google Drive (requiere que el archivo sea accesible por enlace). */
export function driveThumbnail(fileId: string, width = 480): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

/** Miniatura según proveedor. */
export function videoThumbnail(provider: VideoProvider | undefined, id: string): string {
  return provider === 'drive' ? driveThumbnail(id) : youTubeThumbnail(id, 'mq');
}
