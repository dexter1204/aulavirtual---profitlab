'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { IconCheck, IconX, IconInfo } from './icons';
import { hNotify, hImpact } from '@/lib/haptics';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<{
  toast: (message: string, kind?: ToastKind) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
    // Feedback háptico en el mismo instante en que aparece (causalidad).
    if (kind === 'success') hNotify('success');
    else if (kind === 'error') hNotify('error');
    else hImpact('light');
    setItems((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={styles.wrap}>
        {items.map((t) => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              borderColor:
                t.kind === 'success' ? 'var(--long)' : t.kind === 'error' ? 'var(--short)' : 'var(--border-hi)',
            }}
          >
            <span
              style={{
                display: 'flex',
                flexShrink: 0,
                color:
                  t.kind === 'success' ? '#86EFAC' : t.kind === 'error' ? '#FCA5A5' : 'var(--primary)',
              }}
              aria-hidden="true"
            >
              {t.kind === 'success' ? <IconCheck size={16} /> : t.kind === 'error' ? <IconX size={16} /> : <IconInfo size={16} />}
            </span>
            <span style={{ color: 'var(--text)', fontSize: 13 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx.toast;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 9999,
    width: 'calc(100% - 32px)',
    maxWidth: 420,
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border-hi)',
    borderRadius: 'var(--r-md)',
    padding: '12px 16px',
    boxShadow: 'var(--shadow-pop)',
    pointerEvents: 'auto',
    animation: 'pl-rise var(--dur-base) var(--ease-out)',
  },
};
