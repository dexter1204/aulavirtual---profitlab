'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion, useDragControls, type PanInfo } from 'framer-motion';
import { IconInbox, IconX } from './icons';
import { hImpact } from '@/lib/haptics';

// ---------- Contenedor de página ----------
export function Page({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '20px 16px 40px' }}>{children}</div>;
}

// ---------- Encabezado de sección ----------
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 className="pl-title" style={{ color: 'var(--text)', fontSize: 25, margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '7px 0 0', lineHeight: 1.45 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ---------- Botón ----------
type BtnProps = {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  disabled?: boolean;
  full?: boolean;
  style?: React.CSSProperties;
};

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled,
  full,
  style,
}: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: 'none',
    borderRadius: 'var(--r-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontFamily: 'inherit',
    opacity: disabled ? 0.5 : 1,
    width: full ? '100%' : undefined,
    padding: size === 'sm' ? '9px 14px' : '13px 20px',
    fontSize: size === 'sm' ? 12.5 : 14,
    letterSpacing: 0.2,
    lineHeight: 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: 'var(--primary)', color: '#0A0B0E', boxShadow: '0 1px 0 rgba(255,255,255,0.25) inset' },
    ghost: { backgroundColor: 'var(--surface-hi)', color: 'var(--text)', border: '1px solid var(--border)' },
    outline: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border-hi)' },
    danger: {
      background: 'rgba(239,68,68,0.12)',
      color: '#FCA5A5',
      border: '1px solid rgba(239,68,68,0.35)',
    },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      onPointerDown={disabled ? undefined : () => hImpact('light')}
      disabled={disabled}
      className={disabled ? undefined : 'pl-pressable'}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

// ---------- Campo de formulario ----------
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span
        style={{
          display: 'block',
          color: 'var(--text-muted)',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 7,
          letterSpacing: 0.1,
        }}
      >
        {label}
      </span>
      {children}
      {hint && <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 11, marginTop: 5 }}>{hint}</span>}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  padding: '13px 14px',
  fontSize: 15,
  color: 'var(--text)',
  fontFamily: 'inherit',
  transition: 'border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)',
};

// ---------- Tarjeta ----------
export function Card({
  children,
  style,
  className,
  interactive,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={[interactive ? 'pl-lift' : '', className].filter(Boolean).join(' ') || undefined}
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: 16,
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Estado vacío ----------
export function Empty({
  icon = <IconInbox size={34} color="var(--text-dim)" />,
  title,
  message,
  cta,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        border: '1px dashed var(--border-hi)',
        borderRadius: 'var(--r-lg)',
        background: 'rgba(20,22,28,0.35)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>{icon}</div>
      <h3 className="pl-title" style={{ color: 'var(--text)', fontSize: 17, margin: 0 }}>{title}</h3>
      {message && <p style={{ color: 'var(--text-muted)', fontSize: 13.5, margin: '8px auto 0', maxWidth: 320, lineHeight: 1.5 }}>{message}</p>}
      {cta && (
        <Link
          href={cta.href}
          className="pl-pressable"
          style={{
            display: 'inline-block',
            marginTop: 18,
            backgroundColor: 'var(--primary)',
            color: '#0A0B0E',
            fontWeight: 600,
            fontSize: 13.5,
            padding: '11px 20px',
            borderRadius: 'var(--r-sm)',
            textDecoration: 'none',
          }}
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

// ---------- Spinner ----------
export function Spinner({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
      <div
        style={{
          width: size,
          height: size,
          border: '2.5px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
    </div>
  );
}

// ---------- Modal (sheet arrastrable estilo iOS, con física de spring) ----------
// Manipulación directa 1:1 desde el grabber, rubber-banding al tirar hacia
// arriba, drag-to-dismiss por distancia O velocidad, spring interrumpible y
// haptics al abrir/cerrar. Respeta prefers-reduced-motion.
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const controls = useDragControls();

  // Escape para cerrar + bloquear scroll de fondo + haptic de apertura.
  useEffect(() => {
    if (!open) return;
    hImpact('light');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    // Proyección por velocidad: un flick hacia abajo descarta aunque sea corto.
    if (info.offset.y > 110 || info.velocity.y > 520) {
      hImpact('medium');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'var(--scrim)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            className="modalPanel"
            onClick={(e) => e.stopPropagation()}
            drag={reduce ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.12, bottom: 0.9 }}
            onDragEnd={handleDragEnd}
            initial={{ y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduce ? 0 : '100%', opacity: reduce ? 0 : 1 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '85vh',
              overflowY: 'auto',
              background: 'var(--mat-sheet)',
              border: '1px solid var(--border-hi)',
              borderRadius: 'var(--r-xl) var(--r-xl) var(--r-md) var(--r-md)',
              boxShadow: 'var(--shadow-sheet)',
              marginBottom: 'calc(60px + var(--safe-bottom))',
              padding: '8px 20px 20px',
              touchAction: 'pan-y',
            }}
          >
            {/* Grabber · zona de arrastre (solo desde aquí para no robar el scroll interno) */}
            <div
              onPointerDown={(e) => { if (!reduce) controls.start(e); }}
              style={{ padding: '6px 0 12px', cursor: 'grab', touchAction: 'none', display: 'flex', justifyContent: 'center' }}
            >
              <span style={{ width: 40, height: 5, borderRadius: 'var(--r-pill)', background: 'var(--border-hi)', display: 'block' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 className="pl-title" style={{ color: 'var(--text)', fontSize: 18, margin: 0 }}>
                {title}
              </h3>
              <button
                onClick={onClose}
                onPointerDown={() => hImpact('light')}
                aria-label="Cerrar"
                className="pl-pressable"
                style={{
                  display: 'flex',
                  background: 'var(--surface-hi)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-pill)',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 7,
                }}
              >
                <IconX size={16} />
              </button>
            </div>
            {children}
            {footer && <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Badge ----------
export function Pill({ children, color = '#9AA6B6' }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        color,
        border: `1px solid ${color}3D`,
        backgroundColor: `${color}1F`,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.5,
        padding: '3px 9px',
        borderRadius: 'var(--r-pill)',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}
