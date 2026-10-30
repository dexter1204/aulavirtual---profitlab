export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 110" width={size} height={size * (110 / 100)} style={{ flexShrink: 0 }}>
      <g fill="#C7F94C">
        <rect x="6" y="6" width="38" height="50" rx="9" />
        <rect x="58" y="12" width="34" height="24" rx="7" />
        <rect x="10" y="68" width="26" height="26" rx="7" />
        <rect x="46" y="58" width="46" height="40" rx="8" />
      </g>
    </svg>
  );
}

export function LogoWordmark({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        color: '#F1F5F9',
        fontSize: size,
        fontWeight: 700,
        letterSpacing: -0.3,
        fontFamily: 'var(--font-bricolage), -apple-system, sans-serif',
      }}
    >
      Profit{' '}
      <span style={{ color: '#C7F94C', fontWeight: 800, textShadow: '0 0 16px rgba(199, 249, 76, 0.5)' }}>
        Lab
      </span>
    </span>
  );
}
