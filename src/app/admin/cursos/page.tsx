'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAllCourses, reorderCourses, deleteCourse, updateCourse } from '@/lib/courses';
import type { Course } from '@/lib/api';
import { youTubeThumbnail } from '@/lib/youtube';
import { Page, PageTitle, Spinner, Empty, Pill, Button } from '@/components/ui';
import { AdminNav } from '@/components/AdminNav';
import { useToast } from '@/components/Toast';

export default function AdminCoursesPage() {
  const toast = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listAllCourses()
      .then(setCourses)
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= courses.length) return;
    const arr = [...courses];
    [arr[index], arr[next]] = [arr[next], arr[index]];
    setCourses(arr);
    try {
      await reorderCourses(arr.map((c) => c.id));
    } catch (e: any) {
      toast(e.message, 'error');
      load();
    }
  };

  const togglePublish = async (c: Course) => {
    const status = c.status === 'published' ? 'draft' : 'published';
    try {
      await updateCourse(c.id, { status });
      setCourses((prev) => prev.map((x) => (x.id === c.id ? { ...x, status } : x)));
      toast(status === 'published' ? 'Curso publicado 🚀' : 'Curso pasado a borrador', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const remove = async (c: Course) => {
    if (!confirm(`¿Eliminar "${c.title}"? Se borrarán módulos, clases e inscripciones.`)) return;
    try {
      await deleteCourse(c.id);
      setCourses((prev) => prev.filter((x) => x.id !== c.id));
      toast('Curso eliminado', 'info');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  return (
    <Page>
      <PageTitle
        title="Cursos"
        subtitle="Ordena, publica y edita"
        action={
          <Link href="/admin/cursos/nuevo" style={styles.newBtn}>
            + Nuevo
          </Link>
        }
      />
      <AdminNav />

      {loading ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <Empty icon="🎬" title="Sin cursos" message="Crea tu primer curso para empezar." cta={{ label: 'Crear curso', href: '/admin/cursos/nuevo' }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {courses.map((c, i) => (
            <div key={c.id} style={styles.row}>
              <div style={styles.reorder}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={styles.arrow}>▲</button>
                <span style={{ color: '#64748B', fontSize: 11 }}>{i + 1}</span>
                <button onClick={() => move(i, 1)} disabled={i === courses.length - 1} style={styles.arrow}>▼</button>
              </div>

              {c.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnail_url} alt="" style={styles.thumb} />
              ) : (
                <div style={{ ...styles.thumb, ...styles.thumbFallback }}>🎬</div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/admin/curso/?id=${c.id}`} style={styles.title} className="clamp-2">
                  {c.title}
                </Link>
                <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Pill color={c.status === 'published' ? '#22C55E' : c.status === 'scheduled' ? '#3B82F6' : '#F59E0B'}>
                    {c.status === 'published' ? 'Publicado' : c.status === 'scheduled' ? 'Programado' : 'Borrador'}
                  </Pill>
                  <span style={{ color: '#64748B', fontSize: 11 }}>{c.category}</span>
                  <span style={{ color: '#64748B', fontSize: 11 }}>· {c.access_type === 'free' ? 'Gratis' : 'Por inscripción'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Link href={`/admin/curso/?id=${c.id}`} style={styles.editLink}>✎ Editar</Link>
                  <button onClick={() => togglePublish(c)} style={styles.linkBtn}>
                    {c.status === 'published' ? 'Despublicar' : 'Publicar'}
                  </button>
                  <button onClick={() => remove(c)} style={{ ...styles.linkBtn, color: '#FCA5A5' }}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  newBtn: {
    backgroundColor: '#C7F94C',
    color: '#0A0B0E',
    fontWeight: 700,
    fontSize: 13,
    padding: '9px 16px',
    borderRadius: 10,
    textDecoration: 'none',
  },
  row: {
    display: 'flex',
    gap: 12,
    backgroundColor: '#14161C',
    border: '1px solid #1F222B',
    borderRadius: 14,
    padding: 12,
    alignItems: 'flex-start',
  },
  reorder: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 },
  arrow: {
    background: 'transparent',
    border: '1px solid #1F222B',
    borderRadius: 6,
    color: '#94A3B8',
    fontSize: 10,
    width: 24,
    height: 20,
    cursor: 'pointer',
    lineHeight: 1,
  },
  thumb: { width: 72, height: 46, objectFit: 'cover', borderRadius: 8, flexShrink: 0, backgroundColor: '#0A0B0E' },
  thumbFallback: { display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  title: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    display: 'block',
    lineHeight: '18px',
  },
  editLink: { color: '#C7F94C', fontSize: 12, fontWeight: 600, textDecoration: 'none' },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
  },
};
