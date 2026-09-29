'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseById, getCurriculum, isLessonReleased } from '@/lib/courses';
import { getMyEnrollment } from '@/lib/enrollments';
import { getCourseProgress, setLessonCompleted, countCompleted } from '@/lib/progress';
import type { Course, Module, Lesson, Enrollment } from '@/lib/api';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { Spinner, Button, Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';

export default function LearnPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Learn />
    </Suspense>
  );
}

function Learn() {
  const search = useSearchParams();
  const courseId = search.get('curso') ?? '';
  const lessonParam = search.get('lesson');
  const router = useRouter();
  const { session, isAdmin } = useAuth();
  const toast = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const flatLessons = useMemo(
    () => modules.flatMap((m) => (m.lessons ?? []).map((l) => ({ ...l, moduleTitle: m.title }))),
    [modules]
  );

  const current: (Lesson & { moduleTitle?: string }) | undefined = useMemo(() => {
    if (!flatLessons.length) return undefined;
    return flatLessons.find((l) => l.id === lessonParam) ?? flatLessons[0];
  }, [flatLessons, lessonParam]);

  useEffect(() => {
    if (!courseId || !session) {
      if (!courseId) setLoading(false);
      return;
    }
    (async () => {
      try {
        const c = await getCourseById(courseId);
        if (!c) {
          setDenied(true);
          return;
        }
        setCourse(c);
        const enr = await getMyEnrollment(courseId, session.user.id);
        setEnrollment(enr);
        if (!enr && !isAdmin) {
          setDenied(true);
          return;
        }
        const [mods, prog] = await Promise.all([
          getCurriculum(courseId),
          getCourseProgress(session.user.id, courseId),
        ]);
        setModules(mods);
        setProgress(prog);
      } catch (e) {
        console.error(e);
        setDenied(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId, session, isAdmin]);

  const goToLesson = (id: string) => {
    router.replace(`/aprender/?curso=${courseId}&lesson=${id}`, { scroll: true });
  };

  const release = current
    ? isLessonReleased(current, enrollment?.enrolled_at ?? null, isAdmin)
    : { released: true, availableAt: null };

  const toggleComplete = async () => {
    if (!current || !session) return;
    const next = !progress[current.id];
    setProgress((p) => ({ ...p, [current.id]: next }));
    try {
      await setLessonCompleted(session.user.id, courseId, current.id, next);
      if (next) {
        toast('Clase completada ✓', 'success');
        const idx = flatLessons.findIndex((l) => l.id === current.id);
        const nextLesson = flatLessons[idx + 1];
        if (nextLesson) setTimeout(() => goToLesson(nextLesson.id), 600);
      }
    } catch (e: any) {
      setProgress((p) => ({ ...p, [current.id]: !next }));
      toast(e?.message ?? 'No se pudo guardar el progreso', 'error');
    }
  };

  if (loading) return <Spinner />;
  if (denied)
    return (
      <div style={{ padding: '20px 16px' }}>
        <Empty
          icon="🔒"
          title="Necesitas inscribirte"
          message="Inscríbete en el curso para acceder a las clases."
          cta={{ label: 'Ver curso', href: course ? `/curso/?slug=${course.slug}` : '/cursos/' }}
        />
      </div>
    );
  if (!current)
    return (
      <div style={{ padding: '20px 16px' }}>
        <Empty icon="🎬" title="Sin clases todavía" cta={{ label: 'Volver', href: '/cursos/' }} />
      </div>
    );

  const done = countCompleted(progress);
  const total = flatLessons.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const idx = flatLessons.findIndex((l) => l.id === current.id);
  const prev = flatLessons[idx - 1];
  const next = flatLessons[idx + 1];

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      <Link href={course ? `/curso/?slug=${course.slug}` : '/cursos/'} style={styles.back}>
        ← {course?.title ?? 'Curso'}
      </Link>

      {/* PLAYER */}
      {release.released ? (
        <YouTubePlayer youtubeId={current.youtube_id} title={current.title} />
      ) : (
        <div style={styles.locked}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>⏳</div>
          <p style={{ color: '#F1F5F9', fontWeight: 600, margin: 0 }}>Clase bloqueada por goteo</p>
          <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 6 }}>
            Disponible el{' '}
            {release.availableAt?.toLocaleDateString('es', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      )}

      {/* INFO CLASE */}
      <div style={{ marginTop: 14 }}>
        <span style={{ color: '#C7F94C', fontSize: 11, fontWeight: 600 }}>{current.moduleTitle}</span>
        <h1 style={styles.title}>{current.title}</h1>
        {current.description && <p style={styles.desc}>{current.description}</p>}

        {current.resources && (
          <div style={styles.resources}>
            <span style={{ color: '#94A3B8', fontSize: 12, fontWeight: 600 }}>📎 Recursos</span>
            <p style={{ color: '#CBD5E1', fontSize: 13, whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>
              {current.resources}
            </p>
          </div>
        )}
      </div>

      {/* CONTROLES */}
      <div style={styles.controls}>
        <Button variant="outline" size="sm" onClick={() => prev && goToLesson(prev.id)} disabled={!prev}>
          ← Anterior
        </Button>
        {release.released && (
          <Button variant={progress[current.id] ? 'ghost' : 'primary'} size="sm" onClick={toggleComplete}>
            {progress[current.id] ? '✓ Completada' : 'Marcar completada'}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => next && goToLesson(next.id)} disabled={!next}>
          Siguiente →
        </Button>
      </div>

      {/* PROGRESO */}
      <div style={{ marginTop: 18 }}>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${pct}%` }} />
        </div>
        <span style={{ color: '#94A3B8', fontSize: 12, marginTop: 6, display: 'block' }}>
          {done}/{total} clases · {pct}%
        </span>
      </div>

      {/* CURRÍCULO */}
      <h2 style={styles.currTitle}>Contenido</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {modules.map((m, mi) => (
          <div key={m.id} style={styles.module}>
            <div style={styles.moduleHead}>
              <span style={styles.moduleIdx}>{mi + 1}</span>
              <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>{m.title}</span>
            </div>
            {(m.lessons ?? []).map((l) => {
              const rel = isLessonReleased(l, enrollment?.enrolled_at ?? null, isAdmin);
              const active = l.id === current.id;
              return (
                <button
                  key={l.id}
                  onClick={() => goToLesson(l.id)}
                  style={{
                    ...styles.lessonItem,
                    backgroundColor: active ? 'rgba(199,249,76,0.1)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 13 }}>
                    {progress[l.id] ? '✅' : rel.released ? (active ? '🔴' : '▶️') : '⏳'}
                  </span>
                  <span
                    className="clamp-2"
                    style={{ flex: 1, textAlign: 'left', color: active ? '#C7F94C' : '#CBD5E1', fontSize: 13, fontWeight: active ? 600 : 400 }}
                  >
                    {l.title}
                  </span>
                  {l.duration && <span style={{ color: '#64748B', fontSize: 11 }}>{l.duration}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  back: { color: '#94A3B8', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 12 },
  locked: {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 14,
    border: '1px solid #1F222B',
    backgroundColor: '#14161C',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 20,
  },
  title: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: 800,
    margin: '6px 0 0',
    lineHeight: '25px',
    fontFamily: 'var(--font-bricolage), sans-serif',
    letterSpacing: -0.4,
  },
  desc: { color: '#CBD5E1', fontSize: 14, lineHeight: '21px', margin: '10px 0 0', whiteSpace: 'pre-wrap' },
  resources: {
    marginTop: 14,
    backgroundColor: '#14161C',
    border: '1px solid #1F222B',
    borderRadius: 12,
    padding: 14,
  },
  controls: { display: 'flex', gap: 8, marginTop: 18, justifyContent: 'space-between', flexWrap: 'wrap' },
  progressTrack: { width: '100%', height: 8, backgroundColor: '#14161C', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C7F94C', borderRadius: 999, boxShadow: '0 0 12px rgba(199,249,76,0.5)' },
  currTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: 700,
    margin: '26px 0 12px',
    fontFamily: 'var(--font-bricolage), sans-serif',
  },
  module: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 12, overflow: 'hidden' },
  moduleHead: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderBottom: '1px solid #1F222B' },
  moduleIdx: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: 'rgba(199,249,76,0.15)',
    color: '#C7F94C',
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lessonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #14161C',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
