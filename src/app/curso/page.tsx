'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getCourseBySlug, getCurriculum } from '@/lib/courses';
import { enrollMe, getMyEnrollment, unenrollMe } from '@/lib/enrollments';
import { getCourseProgress, countCompleted } from '@/lib/progress';
import { getCourseStats, startCheckout, type Course, type Module, type Enrollment } from '@/lib/api';
import { youTubeThumbnail } from '@/lib/youtube';
import { Page, Spinner, Button, Pill, Card, Empty } from '@/components/ui';
import { useToast } from '@/components/Toast';

const levelLabel: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

function money(amount: number, currency: string): string {
  if (!amount || amount <= 0) return 'Gratis';
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Suma duraciones "mm:ss" o "h:mm:ss" de todas las clases; devuelve texto o null. */
function totalDuration(modules: Module[]): string | null {
  let secs = 0;
  let any = false;
  for (const m of modules) {
    for (const l of m.lessons ?? []) {
      if (!l.duration) continue;
      const parts = l.duration.split(':').map((x) => parseInt(x, 10));
      if (parts.some((n) => isNaN(n))) continue;
      let s = 0;
      if (parts.length === 3) s = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) s = parts[0] * 60 + parts[1];
      else continue;
      secs += s;
      any = true;
    }
  }
  if (!any) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.round((secs % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #1F222B' }}>
      <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
      <span style={{ color: '#94A3B8', fontSize: 13, flex: 1 }}>{label}</span>
      <span style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CourseDetail />
    </Suspense>
  );
}

function CourseDetail() {
  const slug = useSearchParams().get('slug') ?? '';
  const { session, isAdmin } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [students, setStudents] = useState<number>(0);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const c = await getCourseBySlug(slug);
        setCourse(c);
        if (c) {
          const [mods, enr, stats] = await Promise.all([
            getCurriculum(c.id),
            session ? getMyEnrollment(c.id, session.user.id) : Promise.resolve(null),
            getCourseStats(c.id).catch(() => ({ students: 0 })),
          ]);
          setModules(mods);
          setEnrollment(enr);
          setStudents(stats.students);
          if (enr && session) setProgress(await getCourseProgress(session.user.id, c.id));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, session]);

  const totalLessons = modules.reduce((n, m) => n + (m.lessons?.length ?? 0), 0);
  const firstLessonId = modules.find((m) => m.lessons?.length)?.lessons?.[0]?.id;

  const handleEnroll = async () => {
    if (!course || !session) return;
    setWorking(true);
    try {
      await enrollMe(course.id);
      const enr = await getMyEnrollment(course.id, session.user.id);
      setEnrollment(enr);
      toast('¡Inscripción exitosa! Ya puedes ver el curso.', 'success');
    } catch (e: any) {
      toast(e?.message ?? 'No se pudo completar la inscripción', 'error');
    } finally {
      setWorking(false);
    }
  };

  const handleBuy = async () => {
    if (!course) return;
    setWorking(true);
    try {
      const { init_point } = await startCheckout(course.id);
      if (init_point) window.location.href = init_point;
      else throw new Error('No se obtuvo el enlace de pago');
    } catch (e: any) {
      toast(e?.message ?? 'No se pudo iniciar el pago', 'error');
      setWorking(false);
    }
  };

  const handleUnenroll = async () => {
    if (!course || !session) return;
    if (!confirm('¿Cancelar tu inscripción a este curso? Perderás el acceso a las clases.')) return;
    setWorking(true);
    try {
      await unenrollMe(course.id, session.user.id);
      setEnrollment(null);
      toast('Inscripción cancelada', 'info');
    } catch (e: any) {
      toast(e?.message ?? 'Error al cancelar', 'error');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Spinner />;
  if (!course)
    return (
      <Page>
        <Empty icon="🔎" title="Curso no encontrado" cta={{ label: 'Volver al catálogo', href: '/cursos/' }} />
      </Page>
    );

  const done = countCompleted(progress);
  const pct = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0;
  const enrolled = !!enrollment;
  const canWatch = enrolled || isAdmin;
  const learnHref = (lessonId?: string) =>
    `/aprender/?curso=${course.id}${lessonId ? `&lesson=${lessonId}` : ''}`;

  return (
    <Page>
      <Link href="/cursos/" style={styles.back}>
        ← Catálogo
      </Link>

      {/* HERO */}
      <div style={styles.hero}>
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt={course.title} style={styles.heroImg} />
        ) : (
          <div style={{ ...styles.heroImg, ...styles.heroFallback }}>🎬</div>
        )}
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <Pill color="#C7F94C">{course.category}</Pill>
            <Pill>{levelLabel[course.level] ?? course.level}</Pill>
            {course.status !== 'published' && <Pill color="#F59E0B">{course.status}</Pill>}
          </div>
          <h1 style={styles.heroTitle}>{course.title}</h1>
          {course.subtitle && <p style={styles.heroSub}>{course.subtitle}</p>}
          <p style={styles.instructor}>Por {course.instructor}</p>
        </div>
      </div>

      {/* ACCIÓN */}
      <Card style={{ marginTop: 16 }}>
        {enrolled && (
          <div style={{ marginBottom: 14 }}>
            <div style={styles.progressTrack}>
              <div style={{ ...styles.progressFill, width: `${pct}%` }} />
            </div>
            <span style={{ color: '#94A3B8', fontSize: 12, marginTop: 6, display: 'block' }}>
              {done}/{totalLessons} clases completadas · {pct}%
            </span>
          </div>
        )}

        {!enrolled && !isAdmin && (
          <div style={{ marginBottom: 12 }}>
            <span style={{ color: course.price > 0 ? '#F1F5F9' : '#86EFAC', fontSize: 24, fontWeight: 800 }}>
              {money(course.price, course.currency)}
            </span>
          </div>
        )}

        {canWatch ? (
          <Button full onClick={() => router.push(learnHref(firstLessonId))} disabled={totalLessons === 0}>
            {totalLessons === 0 ? 'Sin clases todavía' : enrolled && done > 0 ? '▶  Continuar curso' : '▶  Comenzar curso'}
          </Button>
        ) : course.price > 0 ? (
          <>
            <Button full onClick={handleBuy} disabled={working || !session}>
              {working ? 'Redirigiendo…' : `💳  Comprar por ${money(course.price, course.currency)}`}
            </Button>
            <p style={styles.mpNote}>Pago seguro con Mercado Pago · tarjeta, Yape, transferencia y más</p>
          </>
        ) : course.access_type === 'free' ? (
          <Button full onClick={handleEnroll} disabled={working || !session}>
            {working ? '...' : '🎓  Inscribirme gratis'}
          </Button>
        ) : (
          <div style={styles.lockedNote}>
            🔒 Este curso requiere inscripción gestionada por la academia. Contacta a tu asesor.
          </div>
        )}

        {!session && (
          <p style={{ color: '#FCD34D', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
            Inicia sesión para inscribirte o comprar.
          </p>
        )}

        {enrolled && (
          <button onClick={handleUnenroll} disabled={working} style={styles.unenroll}>
            Cancelar inscripción
          </button>
        )}
      </Card>

      {/* DETALLES DEL CURSO */}
      <Card style={{ marginTop: 16 }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 2 }}>Detalles del curso</h2>
        <DetailRow icon="📚" label="Lecciones" value={totalLessons} />
        <DetailRow icon="🧩" label="Módulos" value={modules.length} />
        {totalDuration(modules) && <DetailRow icon="🎬" label="Duración" value={totalDuration(modules)} />}
        <DetailRow icon="📊" label="Nivel" value={levelLabel[course.level] ?? course.level} />
        <DetailRow icon="👥" label="Alumnos inscritos" value={students} />
        <DetailRow
          icon="💳"
          label="Acceso"
          value={course.price > 0 ? money(course.price, course.currency) : course.access_type === 'free' ? 'Gratis' : 'Por inscripción'}
        />
        <DetailRow icon="🏆" label="Certificado" value="Al completar" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0' }}>
          <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>📱</span>
          <span style={{ color: '#94A3B8', fontSize: 13 }}>Disponible en Desktop, Tablet y Móvil</span>
        </div>
      </Card>

      {/* DESCRIPCIÓN */}
      {course.description && (
        <section style={{ marginTop: 24 }}>
          <h2 style={styles.sectionTitle}>Sobre este curso</h2>
          <p style={styles.desc}>{course.description}</p>
        </section>
      )}

      {/* CURRÍCULO */}
      <section style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={styles.sectionTitle}>Contenido del curso</h2>
          <span style={{ color: '#64748B', fontSize: 12 }}>
            {modules.length} módulos · {totalLessons} clases
          </span>
        </div>

        {modules.length === 0 ? (
          <p style={{ color: '#64748B', fontSize: 13 }}>El contenido se publicará pronto.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {modules.map((m, mi) => (
              <div key={m.id} style={styles.module}>
                <div style={styles.moduleHead}>
                  <span style={styles.moduleIdx}>{mi + 1}</span>
                  <span style={styles.moduleTitle}>{m.title}</span>
                  <span style={{ color: '#64748B', fontSize: 11 }}>{m.lessons?.length ?? 0} clases</span>
                </div>
                <div>
                  {(m.lessons ?? []).map((l) => {
                    const unlocked = canWatch || l.is_preview;
                    const isDone = progress[l.id];
                    const inner = (
                      <div style={styles.lesson}>
                        <span style={{ fontSize: 14 }}>{isDone ? '✅' : unlocked ? '▶️' : '🔒'}</span>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={youTubeThumbnail(l.youtube_id, 'mq')} alt="" style={styles.lessonThumb} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={styles.lessonTitle} className="clamp-2">
                            {l.title}
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            {l.is_preview && <span style={styles.previewTag}>Muestra gratis</span>}
                            {l.duration && <span style={{ color: '#64748B', fontSize: 11 }}>{l.duration}</span>}
                          </div>
                        </div>
                      </div>
                    );
                    return unlocked ? (
                      <Link key={l.id} href={learnHref(l.id)} style={styles.lessonLink}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={l.id} style={{ ...styles.lessonLink, opacity: 0.55, cursor: 'default' }}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  back: { color: '#94A3B8', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 14 },
  hero: { position: 'relative', borderRadius: 18, overflow: 'hidden', border: '1px solid #1F222B' },
  heroImg: { width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' },
  heroFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 48,
    background: 'linear-gradient(135deg, rgba(199,249,76,0.14), rgba(59,130,246,0.14))',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(10,11,14,0.96) 10%, rgba(10,11,14,0.3) 60%, transparent)',
  },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  heroTitle: {
    color: '#F1F5F9',
    fontSize: 24,
    fontWeight: 800,
    margin: 0,
    lineHeight: '28px',
    fontFamily: 'var(--font-bricolage), sans-serif',
    letterSpacing: -0.5,
  },
  heroSub: { color: '#CBD5E1', fontSize: 14, margin: '8px 0 0' },
  instructor: { color: '#94A3B8', fontSize: 12, margin: '10px 0 0', fontWeight: 500 },
  progressTrack: { width: '100%', height: 8, backgroundColor: '#0A0B0E', borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#C7F94C', borderRadius: 999, boxShadow: '0 0 12px rgba(199,249,76,0.5)' },
  lockedNote: {
    color: '#FCD34D',
    backgroundColor: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 10,
    padding: 14,
    fontSize: 13,
    textAlign: 'center',
  },
  mpNote: { color: '#64748B', fontSize: 11, textAlign: 'center', margin: '8px 0 0' },
  unenroll: {
    display: 'block',
    width: '100%',
    marginTop: 10,
    background: 'transparent',
    border: 'none',
    color: '#64748B',
    fontSize: 12,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 6,
  },
  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 17,
    fontWeight: 700,
    margin: '0 0 10px',
    fontFamily: 'var(--font-bricolage), sans-serif',
  },
  desc: { color: '#CBD5E1', fontSize: 14, lineHeight: '22px', whiteSpace: 'pre-wrap', margin: 0 },
  module: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 14, overflow: 'hidden' },
  moduleHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderBottom: '1px solid #1F222B',
  },
  moduleIdx: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(199,249,76,0.15)',
    color: '#C7F94C',
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  moduleTitle: { color: '#F1F5F9', fontSize: 14, fontWeight: 600, flex: 1 },
  lessonLink: { display: 'block', textDecoration: 'none', borderBottom: '1px solid #14161C' },
  lesson: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' },
  lessonThumb: { width: 64, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0, backgroundColor: '#0A0B0E' },
  lessonTitle: { color: '#F1F5F9', fontSize: 13, fontWeight: 500, lineHeight: '17px' },
  previewTag: { color: '#C7F94C', fontSize: 10, fontWeight: 600 },
};
