// ============================================================
// Haptics · feedback táctil multimodal (Apple HIG)
// Nativo en iOS/Android vía @capacitor/haptics; en web, fallback
// a navigator.vibrate (Android) y no-op donde no exista.
// Regla: haptics solo en momentos con significado (commit, snap,
// cambio de selección, éxito/error). Nunca en acciones repetidas
// cientos de veces al día.
// ============================================================
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function webVibrate(ms: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}

/** Golpe de impacto: ligero (tap/press), medio (commit), fuerte (acción grande). */
export function hImpact(style: 'light' | 'medium' | 'heavy' = 'light') {
  if (isNative()) {
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    Haptics.impact({ style: map[style] }).catch(() => {});
    return;
  }
  webVibrate(style === 'heavy' ? 18 : style === 'medium' ? 12 : 7);
}

/** Tick sutil de cambio de selección (tabs, toggles, segmented controls). */
export function hSelection() {
  if (isNative()) {
    Haptics.selectionStart().catch(() => {});
    Haptics.selectionChanged().catch(() => {});
    Haptics.selectionEnd().catch(() => {});
    return;
  }
  webVibrate(5);
}

/** Notificación de resultado: éxito / aviso / error. */
export function hNotify(type: 'success' | 'warning' | 'error' = 'success') {
  if (isNative()) {
    const map = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    Haptics.notification({ type: map[type] }).catch(() => {});
    return;
  }
  webVibrate(type === 'error' ? [8, 40, 8] : type === 'warning' ? 14 : 10);
}
