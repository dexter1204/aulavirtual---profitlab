'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { IconCheck, IconX, IconInfo } from './icons';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; kind: ToastKind };

const ToastContext = createContext<{
  toast: (message: string, kind?: ToastKind) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now() + Math.random();
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
                t.kind === 'success' ? '#22C55E' : t.kind === 'error' ? '#EF4444' : '#262932',
            }}
          >
            <span
              style={{
                display: 'flex',
                flexShrink: 0,
                color:
                  t.kind === 'success' ? '#86EFAC' : t.kind === 'error' ? '#FCA5A5' : '#C7F94C',
              }}
              aria-hidden="true"
            >
              {t.kind === 'success' ? <IconCheck size={16} /> : t.kind === 'error' ? <IconX size={16} /> : <IconInfo size={16} />}
            </span>
            <span style={{ color: '#F1F5F9', fontSize: 13 }}>{t.message}</span>
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
    backgroundColor: 'rgba(20, 22, 28, 0.95)',
    border: '1px solid #262932',
    borderRadius: 12,
    padding: '12px 16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
};
