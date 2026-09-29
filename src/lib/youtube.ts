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
