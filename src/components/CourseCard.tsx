'use client';

import Link from 'next/link';
import type { Course } from '@/lib/supabase';

const levelLabel: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export function CourseCard({
  course,
  href,
  progress,
  badge,
}: {
  course: Course;
  href: string;
  progress?: { done: number; total: number } | null;
  badge?: string;
}) {
  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Link href={href} style={styles.card}>
      <div style={styles.thumbWrap}>
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt={course.title} style={styles.thumb} />
        ) : (
          <div style={styles.thumbFallback}>
            <span style={{ fontSize: 32 }}>🎬</span>
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
        <h3 style={styles.title} className="clamp-2">
          {course.title}
        </h3>
        {course.subtitle && (
          <p style={styles.subtitle} className="clamp-2">
            {course.subtitle}
          </p>
        )}

        <div style={styles.metaRow}>
          <span style={styles.instructor}>{course.instructor}</span>
          <span style={styles.level}>{levelLabel[course.level] ?? course.level}</span>
        </div>

        {progress && progress.total > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${pct}%` }} />
            </div>
            <span style={styles.progressLabel}>
              {progress.done}/{progress.total} clases · {pct}%
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'block',
    backgroundColor: '#14161C',
    border: '1px solid #1F222B',
    borderRadius: 16,
    overflow: 'hidden',
    textDecoration: 'none',
  },
  thumbWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    backgroundColor: '#0A0B0E',
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%', objectFit: 'cover' },
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
    backgroundColor: 'rgba(10, 11, 14, 0.8)',
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
  body: { padding: 14 },
  title: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: 700,
    margin: 0,
    lineHeight: '20px',
    fontFamily: 'var(--font-bricolage), sans-serif',
  },
  subtitle: { color: '#94A3B8', fontSize: 12, margin: '6px 0 0 0', lineHeight: '17px' },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  instructor: { color: '#64748B', fontSize: 11, fontWeight: 500 },
  level: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 600,
    border: '1px solid #1F222B',
    padding: '3px 7px',
    borderRadius: 6,
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
