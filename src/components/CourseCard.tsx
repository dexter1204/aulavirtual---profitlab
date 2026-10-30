'use client';

import Link from 'next/link';
import type { Course } from '@/lib/api';
import { IconArrowRight, IconUsers } from './icons';
import { LogoMark } from './Logo';

const levelLabel: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** 1234 → "1.2K"; <1000 queda igual. */
function compact(n: number): string {
  if (n < 1000) return String(n);
  return new Intl.NumberFormat('es', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function CourseCard({
  course,
  href,
  progress,
  badge,
  students,
}: {
  course: Course;
  href: string;
  progress?: { done: number; total: number } | null;
  badge?: string;
  students?: number;
}) {
  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const hasProgress = !!progress && progress.total > 0;

  const priceLabel =
    course.price > 0
      ? money(course.price, course.currency)
      : course.access_type === 'free'
      ? 'Gratis'
      : 'Por inscripción';
  const isFree = course.price <= 0 && course.access_type === 'free';

  return (
    <Link href={href} className="courseCard" style={styles.card}>
      <div style={styles.thumbWrap}>
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt={course.title} className="courseThumb" style={styles.thumb} loading="lazy" />
        ) : (
          <div style={styles.thumbFallback} aria-hidden="true">
            <span style={styles.thumbGlow} />
            <LogoMark size={40} />
            <span style={styles.thumbWordmark}>PROFITLAB ACADEMY</span>
          </div>
        )}
        <span style={styles.category}>{course.category}</span>
        {badge && <span style={styles.badge}>{badge}</span>}
        {course.status !== 'published' && (
          <span style={styles.draftBadge}>
            {course.status === 'scheduled' ? 'Programado' : 'Borrador'}
          </span>
        )}
      </div>

      <div style={styles.body}>
        <div style={styles.metaTop}>
          <span style={styles.level}>{levelLabel[course.level] ?? course.level}</span>
          {typeof students === 'number' && students > 0 && (
            <span style={styles.students} aria-label={`${students} alumnos inscritos`}>
              <span aria-hidden="true" style={{ display: 'inline-flex' }}>
                <IconUsers size={13} color="#64748B" />
              </span>
              {compact(students)}
            </span>
          )}
        </div>

        <h3 style={styles.title} className="clamp-2">
          {course.title}
        </h3>
        {course.subtitle && (
          <p style={styles.subtitle} className="clamp-2">
            {course.subtitle}
          </p>
        )}

        <span style={styles.instructor}>Por {course.instructor}</span>

        {hasProgress ? (
          <div style={{ marginTop: 'auto', paddingTop: 12 }}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${pct}%` }} />
            </div>
            <span style={styles.progressLabel}>
              {progress!.done}/{progress!.total} clases · {pct}%
            </span>
          </div>
        ) : (
          <div style={styles.footer}>
            <span style={{ ...styles.price, color: isFree ? '#86EFAC' : 'var(--text)' }}>
              {priceLabel}
            </span>
            <span style={styles.cta} className="courseCardCta">
              Ver curso
              <span aria-hidden="true" style={{ display: 'inline-flex' }}>
                <IconArrowRight size={14} />
              </span>
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    overflow: 'hidden',
    textDecoration: 'none',
    height: '100%',
    boxShadow: 'var(--shadow-card)',
  },
  thumbWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: 'var(--bg)',
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbFallback: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'linear-gradient(135deg, #171A21 0%, #0E1117 55%, #0B111A 100%)',
    overflow: 'hidden',
  },
  thumbGlow: {
    position: 'absolute',
    top: '-30%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '120%',
    height: '90%',
    background: 'radial-gradient(60% 70% at 50% 50%, rgba(199,249,76,0.14), rgba(199,249,76,0) 70%)',
    pointerEvents: 'none',
  },
  thumbWordmark: {
    position: 'relative',
    color: 'var(--text-dim)',
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 2,
    fontFamily: 'var(--font-bricolage), sans-serif',
  },
  category: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(10, 11, 14, 0.82)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    color: 'var(--primary)',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.4,
    padding: '4px 8px',
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  badge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'var(--primary)',
    color: 'var(--bg)',
    fontSize: 10,
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: 6,
  },
  draftBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#FCD34D',
    border: '1px solid rgba(245,158,11,0.4)',
    fontSize: 10,
    fontWeight: 600,
    padding: '3px 7px',
    borderRadius: 6,
  },
  body: { padding: 14, display: 'flex', flexDirection: 'column', flex: 1 },
  metaTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  level: {
    color: 'var(--text-muted)',
    fontSize: 10,
    fontWeight: 600,
    border: '1px solid var(--border)',
    padding: '3px 7px',
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  students: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: 'var(--text-dim)',
    fontSize: 11,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  title: {
    color: 'var(--text)',
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    lineHeight: '20px',
    fontFamily: 'var(--font-bricolage), sans-serif',
  },
  subtitle: { color: 'var(--text-muted)', fontSize: 12, margin: '6px 0 0 0', lineHeight: '17px' },
  instructor: { color: 'var(--text-dim)', fontSize: 11, fontWeight: 500, marginTop: 10 },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: 800,
    fontFamily: 'var(--font-bricolage), sans-serif',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: -0.3,
  },
  cta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    color: 'var(--primary)',
    fontSize: 12,
    fontWeight: 700,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'var(--bg)',
    borderRadius: 'var(--r-pill)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'var(--primary)',
    borderRadius: 'var(--r-pill)',
    boxShadow: '0 0 12px rgba(199,249,76,0.5)',
  },
  progressLabel: { color: 'var(--text-muted)', fontSize: 10, marginTop: 5, display: 'block' },
};
