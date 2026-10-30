'use client';

import { YouTubePlayer } from './YouTubePlayer';
import { DrivePlayer } from './DrivePlayer';
import { type VideoProvider } from '@/lib/youtube';

/**
 * Reproductor unificado: enruta cada tipo de enlace a su reproductor propio.
 *   · YouTube → YouTubePlayer (controles propios: play, −10/+10, barra táctil…)
 *   · Drive   → DrivePlayer   (visor de Drive encuadrado y blindado)
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
    return <DrivePlayer fileId={videoId} title={title} />;
  }
  return <YouTubePlayer youtubeId={videoId} title={title} />;
}
