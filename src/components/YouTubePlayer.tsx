'use client';

import { youTubeEmbedUrl } from '@/lib/youtube';

export function YouTubePlayer({ youtubeId, title }: { youtubeId: string; title?: string }) {
  return (
    <div style={styles.wrap}>
      <iframe
        src={youTubeEmbedUrl(youtubeId)}
        title={title ?? 'Video'}
        style={styles.iframe}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
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
