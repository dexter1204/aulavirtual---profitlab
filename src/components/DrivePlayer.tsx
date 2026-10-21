'use client';

import { useEffect, useRef, useState } from 'react';
import { driveEmbedUrl, driveThumbnail } from '@/lib/youtube';

/**
 * Reproductor para videos de Google Drive.
 *
 * En lugar de incrustar el visor de Drive directamente (que muestra su propio
 * play descentrado y el botón ↗ "abrir en Drive" que saca de la app), mostramos
 * un PÓSTER con un play propio centrado. Al tocarlo, el video de Drive EMERGE
 * en una ventana a pantalla (estilo Amazon/Prime), con botón de cerrar y con la
 * esquina superior derecha de Drive tapada (↗ / descarga).
 *
 * Nota: el video sigue reproduciéndose dentro del <iframe> de Drive (es un
 * dominio ajeno y el navegador no permite controlarlo desde fuera), así que los
 * controles de reproducir/avanzar dentro de la ventana son los de Drive.
 */
export function DrivePlayer({ fileId, title }: { fileId: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [thumbErr, setThumbErr] = useState(false);
  // En vertical giramos la ventana con CSS para verla horizontal (fallback para
  // iPhone, donde el sistema no deja forzar la orientación por software).
  const [rotate, setRotate] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Bloquear scroll del fondo.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Cerrar con Escape.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);

    // 1) Intento real: pantalla completa + bloquear horizontal
    //    (funciona en Android / app instalada; en iPhone lanza y se ignora).
    (async () => {
      try {
        await modalRef.current?.requestFullscreen?.();
      } catch { /* no soportado */ }
      try {
        await (screen.orientation as any)?.lock?.('landscape');
      } catch { /* iOS u otros: no soportado */ }
    })();

    // 2) Fallback CSS: si el visor sigue en vertical, rotamos la ventana.
    const updateRot = () => setRotate(window.innerHeight > window.innerWidth);
    updateRot();
    window.addEventListener('resize', updateRot);
    window.addEventListener('orientationchange', updateRot);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updateRot);
      window.removeEventListener('orientationchange', updateRot);
      try { (screen.orientation as any)?.unlock?.(); } catch { /* ignore */ }
      if (document.fullscreenElement) { try { document.exitFullscreen(); } catch { /* ignore */ } }
    };
  }, [open]);

  return (
    <>
      {/* PÓSTER con play propio centrado */}
      <button style={styles.poster} onClick={() => setOpen(true)} aria-label="Reproducir video">
        {!thumbErr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={driveThumbnail(fileId, 1280)}
            alt=""
            style={styles.thumb}
            onError={() => setThumbErr(true)}
          />
        )}
        <span style={styles.scrim} />
        <span style={styles.bigPlay}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="#0A0B0E"><path d="M8 5v14l11-7z" /></svg>
        </span>
        {title && <span style={styles.posterTitle} className="clamp-2">{title}</span>}
      </button>

      {/* VENTANA emergente con el video de Drive */}
      {open && (
        <div ref={modalRef} style={styles.modal} role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <button style={styles.close} onClick={() => setOpen(false)} aria-label="Cerrar video">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div
            style={rotate ? { ...styles.stage, ...styles.stageRotated } : styles.stage}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={driveEmbedUrl(fileId)}
              title={title || 'Video'}
              allow="autoplay; fullscreen"
              allowFullScreen
              style={styles.iframe}
            />
            {/* Tapa la esquina superior derecha de Drive (↗ "abrir en Drive" y
                el icono de descarga) para que no saque de la app ni permita
                descargar. */}
            <div style={styles.cornerBlock} />
          </div>
        </div>
      )}
    </>
  );
}

const lime = '#C7F94C';
const styles: Record<string, React.CSSProperties> = {
  // ---- Póster ----
  poster: {
    position: 'relative',
    display: 'block',
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#0A0B0E',
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid #1F222B',
    padding: 0,
    cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent',
  },
  thumb: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  scrim: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(circle at center, rgba(0,0,0,0.25), rgba(0,0,0,0.55))',
  },
  bigPlay: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 66, height: 66, borderRadius: '50%', backgroundColor: lime,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 24px rgba(199,249,76,0.5)', paddingLeft: 5,
  },
  posterTitle: {
    position: 'absolute', left: 12, right: 12, bottom: 10,
    color: '#F1F5F9', fontSize: 13, fontWeight: 600, textAlign: 'left',
    textShadow: '0 1px 6px rgba(0,0,0,0.9)',
  },

  // ---- Ventana emergente ----
  modal: {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(5,6,8,0.94)',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 12,
    paddingTop: 'max(12px, env(safe-area-inset-top))',
  },
  close: {
    position: 'absolute', top: 'max(10px, env(safe-area-inset-top))', right: 12, zIndex: 1001,
    width: 42, height: 42, borderRadius: '50%',
    backgroundColor: 'rgba(20,22,28,0.9)', border: '1px solid #262932',
    color: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
  },
  // Limita el ANCHO para que la altura (ancho·9/16) nunca supere la pantalla:
  // así la ventana cabe entera en horizontal y en vertical, sin desbordarse ni
  // montarse sobre los controles.
  stage: {
    position: 'relative', width: '100%',
    maxWidth: 'min(960px, calc((100dvh - 32px) * 16 / 9))',
    aspectRatio: '16 / 9',
    backgroundColor: '#000', borderRadius: 14, overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  },
  // Giro para forzar horizontal cuando el teléfono está en vertical: la ventana
  // ocupa toda la pantalla girada 90°, así el video se ve grande y horizontal.
  // Al girar el teléfono, `rotate` pasa a false y se endereza solo.
  stageRotated: {
    position: 'fixed',
    top: '50%', left: '50%',
    width: '100dvh', height: '100dvw',
    maxWidth: 'none', aspectRatio: 'auto',
    transform: 'translate(-50%, -50%) rotate(90deg)',
    borderRadius: 0,
  },
  iframe: { position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' },
  // Cubre ↗ / descarga de Drive (esquina superior derecha). Degradado opaco a
  // la derecha (oculta los iconos blancos) que se funde hacia la izquierda.
  cornerBlock: {
    position: 'absolute', top: 0, right: 0, width: 130, height: 52,
    background: 'linear-gradient(to left, rgba(0,0,0,0.92) 40%, transparent)',
  },
};
