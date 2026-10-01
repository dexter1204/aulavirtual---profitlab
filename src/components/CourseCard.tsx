'use client';

import Link from 'next/link';
import type { Course } from '@/lib/api';
import { IconVideo, IconArrowRight, IconUsers } from './icons';

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
            <IconVideo size={34} color="#C7F94C" style={{ opacity: 0.55 }} />
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
            <span style={{ ...styles.price, color: isFree ? '#86EFAC' : '#F1F5F9' }}>
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
    backgroundColor: '#14161C',
    border: '1px solid #1F222B',
    borderRadius: 16,
    overflow: 'hidden',
    textDecoration: 'none',
    height: '100%',
  },
  thumbWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#0A0B0E',
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  thumbFallback: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(199,249,76,0.12), rgba(59,130,246,0.12))',
  },
  category: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(10, 11, 14, 0.82)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    color: '#C7F94C',
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
    backgroundColor: '#C7F94C',
    color: '#0A0B0E',
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
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 600,
    border: '1px solid #1F222B',
    padding: '3px 7px',
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  students: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    color: '#64748B',
    fontSize: 11,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  title: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    lineHeight: '20px',
    fontFamily: 'var(--font-bricolage), sans-serif',
  },
  subtitle: { color: '#94A3B8', fontSize: 12, margin: '6px 0 0 0', lineHeight: '17px' },
  instructor: { color: '#64748B', fontSize: 11, fontWeight: 500, marginTop: 10 },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 12,
    borderTop: '1px solid #1F222B',
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
    color: '#C7F94C',
    fontSize: 12,
    fontWeight: 700,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#0A0B0E',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#C7F94C',
    borderRadius: 999,
    boxShadow: '0 0 12px rgba(199,249,76,0.5)',
  },
  progressLabel: { color: '#94A3B8', fontSize: 10, marginTop: 5, display: 'block' },
};
