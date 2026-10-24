'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseById, getCurriculum, isLessonReleased } from '@/lib/courses';
import { getMyEnrollment } from '@/lib/enrollments';
import { getCourseProgress, setLessonCompleted, countCompleted } from '@/lib/progress';
import { listLessonMaterials, materialHref, type Course, type Module, type Lesson, type Enrollment, type Material } from '@/lib/api';
import { formatBytes } from '@/components/materials';
import { VideoPlayer } from '@/components/VideoPlayer';
import { StudentAssignments } from '@/components/StudentAssignments';
import { Spinner, Button, Empty } from '@/components/ui';
import { IconCheck, IconPlay, IconLock, IconDot, IconDocument, IconVideo, IconClock, IconPaperclip, IconDownload, IconExternal, MaterialIcon } from '@/components/icons';
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
  const [materials, setMaterials] = useState<Material[]>([]);

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

  // Cargar materiales de la clase actual
  useEffect(() => {
    if (!current?.id) { setMaterials([]); return; }
    let alive = true;
    listLessonMaterials(current.id)
      .then((m) => { if (alive) setMaterials(m); })
      .catch(() => { if (alive) setMaterials([]); });
    return () => { alive = false; };
  }, [current?.id]);

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
          icon={<IconLock size={34} color="var(--text-dim)" />}
          title="Necesitas inscribirte"
          message="Inscríbete en el curso para acceder a las clases."
          cta={{ label: 'Ver curso', href: course ? `/curso/?slug=${course.slug}` : '/cursos/' }}
        />
      </div>
    );
  if (!current)
    return (
      <div style={{ padding: '20px 16px' }}>
        <Empty icon={<IconVideo size={34} color="var(--text-dim)" />} title="Sin clases todavía" cta={{ label: 'Volver', href: '/cursos/' }} />
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
      <Link href={course ? `/curso/?slug=${course.slug}` : '/cursos/'} className="pl-pressable" style={styles.back}>
        ← {course?.title ?? 'Curso'}
      </Link>

      {/* PLAYER */}
      {release.released ? (
        <VideoPlayer provider={current.video_provider} videoId={current.youtube_id} title={current.title} />
      ) : (
        <div style={styles.locked}>
          <div style={{ marginBottom: 10, color: 'var(--text-dim)' }}><IconClock size={38} /></div>
          <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>Clase bloqueada por goteo</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>
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
        <span style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 600 }}>{current.moduleTitle}</span>
        <h1 className="pl-title" style={styles.title}>{current.title}</h1>
        {current.description && <p style={styles.desc}>{current.description}</p>}

        {current.resources && (
          <div style={styles.resources}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}><IconDocument size={14} color="var(--text-muted)" />Notas</span>
            <p style={{ color: '#CBD5E1', fontSize: 13, whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>
              {current.resources}
            </p>
          </div>
        )}

        {materials.length > 0 && (
          <div style={styles.resources}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}><IconPaperclip size={14} color="var(--text-muted)" />Materiales y recursos</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {materials.map((m) => (
                <a
                  key={m.id}
                  href={materialHref(m.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={m.kind === 'file' ? m.title : undefined}
                  className="pl-pressable"
                  style={styles.material}
                >
                  <span style={{ display: 'flex', flexShrink: 0 }}><MaterialIcon m={m} size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }} className="clamp-2">{m.title}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                      {m.kind === 'file'
                        ? `Descargar${m.size ? ' · ' + formatBytes(m.size) : ''}`
                        : 'Abrir enlace'}
                    </div>
                  </div>
                  <span style={{ color: 'var(--primary)', display: 'flex' }} aria-hidden="true">{m.kind === 'file' ? <IconDownload size={16} /> : <IconExternal size={16} />}</span>
                </a>
              ))}
            </div>
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
        <span style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6, display: 'block' }}>
          {done}/{total} clases · {pct}%
        </span>
      </div>

      {/* TAREAS DEL CURSO (solo si hay) */}
      {!isAdmin && <StudentAssignments courseId={courseId} hideWhenEmpty />}

      {/* CURRÍCULO */}
      <h2 className="pl-title" style={styles.currTitle}>Contenido</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {modules.map((m, mi) => (
          <div key={m.id} style={styles.module}>
            <div style={styles.moduleHead}>
              <span style={styles.moduleIdx}>{mi + 1}</span>
              <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{m.title}</span>
            </div>
            {(m.lessons ?? []).map((l) => {
              const rel = isLessonReleased(l, enrollment?.enrolled_at ?? null, isAdmin);
              const active = l.id === current.id;
              return (
                <button
                  key={l.id}
                  onClick={() => goToLesson(l.id)}
                  className="pl-pressable"
                  style={{
                    ...styles.lessonItem,
                    backgroundColor: active ? 'rgba(199,249,76,0.1)' : 'transparent',
                  }}
                >
                  <span style={{ display: 'flex', flexShrink: 0 }} aria-hidden="true">
                    {progress[l.id] ? (
                      <IconCheck size={15} color="var(--primary)" />
                    ) : rel.released ? (
                      active ? <IconDot size={12} color="var(--primary)" /> : <IconPlay size={12} color="var(--text-muted)" />
                    ) : (
                      <IconLock size={13} color="var(--text-dim)" />
                    )}
                  </span>
                  <span
                    className="clamp-2"
                    style={{ flex: 1, textAlign: 'left', color: active ? 'var(--primary)' : '#CBD5E1', fontSize: 13, fontWeight: active ? 600 : 400 }}
                  >
                    {l.title}
                  </span>
                  {l.duration && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{l.duration}</span>}
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
  back: { color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 12 },
  locked: {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 'var(--r-md)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: 20,
  },
  title: {
    color: 'var(--text)',
    fontSize: 20,
    margin: '6px 0 0',
  },
  desc: { color: '#CBD5E1', fontSize: 14, lineHeight: '21px', margin: '10px 0 0', whiteSpace: 'pre-wrap' },
  resources: {
    marginTop: 14,
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-md)',
    padding: 14,
  },
  material: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-sm)',
    padding: '10px 12px',
    textDecoration: 'none',
  },
  controls: { display: 'flex', gap: 8, marginTop: 18, justifyContent: 'space-between', flexWrap: 'wrap' },
  progressTrack: { width: '100%', height: 8, backgroundColor: 'var(--surface)', borderRadius: 'var(--r-pill)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: 'var(--primary)', borderRadius: 'var(--r-pill)', boxShadow: '0 0 12px rgba(199,249,76,0.5)' },
  currTitle: {
    color: 'var(--text)',
    fontSize: 16,
    margin: '26px 0 12px',
  },
  module: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' },
  moduleHead: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderBottom: '1px solid var(--border)' },
  moduleIdx: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: 'rgba(199,249,76,0.15)',
    color: 'var(--primary)',
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
    borderBottom: '1px solid var(--surface)',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
