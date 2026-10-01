'use client';

import React from 'react';
import Link from 'next/link';

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
      <div>
        <h1
          style={{
            color: '#F1F5F9',
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
            fontFamily: 'var(--font-bricolage), sans-serif',
            letterSpacing: -0.4,
          }}
        >
          {title}
        </h1>
        {subtitle && <p style={{ color: '#94A3B8', fontSize: 13, margin: '6px 0 0' }}>{subtitle}</p>}
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
    borderRadius: 10,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontFamily: 'inherit',
    opacity: disabled ? 0.55 : 1,
    width: full ? '100%' : undefined,
    padding: size === 'sm' ? '8px 12px' : '12px 18px',
    fontSize: size === 'sm' ? 12 : 14,
    letterSpacing: 0.3,
    transition: 'transform 0.1s ease',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: '#C7F94C', color: '#0A0B0E' },
    ghost: { backgroundColor: '#1F222B', color: '#F1F5F9' },
    outline: { background: 'transparent', color: '#F1F5F9', border: '1px solid #262932' },
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
      disabled={disabled}
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
          color: '#94A3B8',
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
      {hint && <span style={{ display: 'block', color: '#64748B', fontSize: 11, marginTop: 4 }}>{hint}</span>}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#14161C',
  border: '1px solid #262932',
  borderRadius: 10,
  padding: '12px 14px',
  fontSize: 14,
  color: '#F1F5F9',
  fontFamily: 'inherit',
};

// ---------- Tarjeta ----------
export function Card({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: '#14161C',
        border: '1px solid #1F222B',
        borderRadius: 14,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Estado vacío ----------
export function Empty({
  icon = '📭',
  title,
  message,
  cta,
}: {
  icon?: string;
  title: string;
  message?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 20px',
        border: '1px dashed #262932',
        borderRadius: 16,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ color: '#F1F5F9', fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
      {message && <p style={{ color: '#94A3B8', fontSize: 13, margin: '8px 0 0' }}>{message}</p>}
      {cta && (
        <Link
          href={cta.href}
          style={{
            display: 'inline-block',
            marginTop: 16,
            backgroundColor: '#C7F94C',
            color: '#0A0B0E',
            fontWeight: 600,
            fontSize: 13,
            padding: '10px 18px',
            borderRadius: 10,
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
          border: '3px solid #1F222B',
          borderTopColor: '#C7F94C',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

// ---------- Modal ----------
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
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '85vh',
          overflowY: 'auto',
          backgroundColor: '#14161C',
          border: '1px solid #262932',
          borderRadius: 16,
          padding: 20,
          marginBottom: 60,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ color: '#F1F5F9', fontSize: 17, fontWeight: 700, margin: 0, fontFamily: 'var(--font-bricolage), sans-serif' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 20, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Badge ----------
export function Pill({ children, color = '#94A3B8' }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        color,
        border: `1px solid ${color}44`,
        backgroundColor: `${color}18`,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.4,
        padding: '3px 8px',
        borderRadius: 6,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}
