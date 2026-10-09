'use client';

import { YouTubePlayer } from './YouTubePlayer';
import { driveEmbedUrl, type VideoProvider } from '@/lib/youtube';

/**
 * Reproductor unificado: usa el reproductor propio de YouTube o, para Google
 * Drive, el visor embebido de Drive (que trae sus propios controles).
 */
export function VideoPlayer({
  provider,
  videoId,
  title,
}: {
  provider?: VideoProvider;
  videoId: string;
  title?: string;
}) {
  if (provider === 'drive') {
    return (
      <div style={styles.wrap}>
        <iframe
          src={driveEmbedUrl(videoId)}
          title={title || 'Video'}
          allow="autoplay; fullscreen"
          allowFullScreen
          style={styles.iframe}
        />
      </div>
    );
  }
  return <YouTubePlayer youtubeId={videoId} title={title} />;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#000',
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid #1F222B',
  },
  iframe: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
};
