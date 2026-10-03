'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ============================================================
// Cargador único de la API IFrame de YouTube
// ============================================================
let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).YT && (window as any).YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiPromise;
}

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function YouTubePlayer({ youtubeId, title }: { youtubeId: string; title?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [fs, setFs] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<any>(null);

  // Crear el player
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !hostRef.current) return;
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(hostRef.current, {
        videoId: youtubeId,
        playerVars: {
          controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3,
          disablekb: 0, playsinline: 1, fs: 0, origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            if (cancelled) return;
            setReady(true);
            setDuration(e.target.getDuration() || 0);
            setVolume(e.target.getVolume() ?? 100);
            setMuted(e.target.isMuted?.() ?? false);
          },
          onStateChange: (e: any) => {
            const S = (window as any).YT.PlayerState;
            setPlaying(e.data === S.PLAYING);
            if (e.data === S.PLAYING) setDuration(e.target.getDuration() || 0);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambiar de video sin recrear el player
  useEffect(() => {
    if (ready && playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(youtubeId);
      setCurrent(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeId]);

  // Bucle de actualización de tiempo
  useEffect(() => {
    const tick = () => {
      const p = playerRef.current;
      if (p && p.getCurrentTime) {
        setCurrent(p.getCurrentTime() || 0);
        const d = p.getDuration?.() || 0;
        if (d) setDuration(d);
        setBuffered((p.getVideoLoadedFraction?.() || 0) * (d || 0));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Pantalla completa
  useEffect(() => {
    const onFs = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.pauseVideo();
    else p.playVideo();
  }, [playing]);

  const seek = (t: number) => {
    playerRef.current?.seekTo?.(t, true);
    setCurrent(t);
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) { p.unMute(); setMuted(false); }
    else { p.mute(); setMuted(true); }
  };

  const changeVolume = (v: number) => {
    playerRef.current?.setVolume?.(v);
    setVolume(v);
    if (v === 0) { playerRef.current?.mute?.(); setMuted(true); }
    else if (muted) { playerRef.current?.unMute?.(); setMuted(false); }
  };

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapRef.current?.requestFullscreen?.();
  };

  const pokeControls = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 2600);
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      style={styles.wrap}
      onMouseMove={pokeControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* host del iframe */}
      <div style={styles.videoLayer}>
        <div ref={hostRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* capa que captura clicks para play/pausa (bloquea interacción directa con YT) */}
      <button aria-label="Reproducir/Pausar" onClick={togglePlay} style={styles.clickLayer}>
        {!playing && ready && (
          <span style={styles.bigPlay}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#0A0B0E"><path d="M8 5v14l11-7z" /></svg>
          </span>
        )}
      </button>

      {!ready && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
        </div>
      )}

      {/* Barra de controles propia */}
      <div style={{ ...styles.controls, opacity: showControls || !playing ? 1 : 0 }}>
        {/* progreso */}
        <div
          style={styles.progressTrack}
          onClick={(e) => {
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            seek(((e.clientX - r.left) / r.width) * duration);
          }}
        >
          <div style={{ ...styles.progressBuffer, width: `${bufPct}%` }} />
          <div style={{ ...styles.progressPlayed, width: `${pct}%` }} />
          <div style={{ ...styles.progressKnob, left: `${pct}%` }} />
        </div>

        <div style={styles.row}>
          <button onClick={togglePlay} style={styles.ctrlBtn} aria-label="play">
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          <button onClick={toggleMute} style={styles.ctrlBtn} aria-label="mute">
            {muted || volume === 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4z" opacity="0.4" /><path d="M19 12l3 3m0-3l-3 3" stroke="currentColor" strokeWidth="2" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8v8a4.5 4.5 0 002.5-4z" /></svg>
            )}
          </button>
          <input
            type="range" min={0} max={100} value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            style={styles.volume}
            aria-label="volumen"
          />

          <span style={styles.time}>{fmt(current)} <span style={{ color: '#64748B' }}>/ {fmt(duration)}</span></span>

          <div style={{ flex: 1 }} />

          {title && <span style={styles.titleLabel} className="clamp-2">{title}</span>}

          <button onClick={toggleFs} style={styles.ctrlBtn} aria-label="fullscreen">
            {fs ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 9H5v2h6V5H9v4zm6 0V5h-2v6h6V9h-4zM5 15h4v4h2v-6H5v2zm10 0h-2v6h2v-4h4v-2h-4z" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h4V5H5v6h2V7zm10 0v4h2V5h-6v2h4zM7 17v-4H5v6h6v-2H7zm10 0h-4v2h6v-6h-2v4z" /></svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const lime = '#C7F94C';
const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'relative', width: '100%', aspectRatio: '16 / 9', backgroundColor: '#000',
    borderRadius: 14, overflow: 'hidden', border: '1px solid #1F222B', userSelect: 'none',
  },
  videoLayer: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  clickLayer: {
    position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent',
    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bigPlay: {
    width: 62, height: 62, borderRadius: '50%', backgroundColor: lime,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(199,249,76,0.5)', paddingLeft: 4,
  },
  loading: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  spinner: { width: 34, height: 34, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: lime, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  controls: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 12px 10px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
    transition: 'opacity 0.25s ease',
  },
  progressTrack: { position: 'relative', height: 6, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, cursor: 'pointer', marginBottom: 8 },
  progressBuffer: { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 999 },
  progressPlayed: { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: lime, borderRadius: 999 },
  progressKnob: { position: 'absolute', top: '50%', width: 12, height: 12, borderRadius: '50%', backgroundColor: lime, transform: 'translate(-50%, -50%)', boxShadow: '0 0 8px rgba(199,249,76,0.8)' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  ctrlBtn: { background: 'transparent', border: 'none', color: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 },
  volume: { width: 70, accentColor: lime, cursor: 'pointer' },
  time: { color: '#F1F5F9', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginLeft: 2 },
  titleLabel: { color: '#CBD5E1', fontSize: 11, maxWidth: 220, textAlign: 'right' },
};
