'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCourseById,
  getCurriculum,
  updateCourse,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  reorderLessons,
  deleteLesson,
} from '@/lib/courses';
import type { Course, Module, Lesson } from '@/lib/api';
import { Page, Spinner, Button, Pill, Empty } from '@/components/ui';
import { CourseForm, type CourseFormValues } from '@/components/CourseForm';
import { LessonEditor } from '@/components/LessonEditor';
import { CourseStudents } from '@/components/CourseStudents';
import { CourseAssignments } from '@/components/CourseAssignments';
import { useToast } from '@/components/Toast';
import { IconPencil, IconTrash, IconSearch, IconEye, IconLayers } from '@/components/icons';

type Tab = 'contenido' | 'tareas' | 'ajustes' | 'alumnos';

export default function EditCoursePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <EditCourse />
    </Suspense>
  );
}

function EditCourse() {
  const id = useSearchParams().get('id') ?? '';
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('contenido');
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [editing, setEditing] = useState<{ moduleId: string; lesson?: Lesson } | null>(null);

  const loadCurriculum = async () => {
    if (!id) return;
    setModules(await getCurriculum(id));
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const c = await getCourseById(id);
        setCourse(c);
        await loadCurriculum();
      } catch (e: any) {
        toast(e.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveSettings = async (values: CourseFormValues) => {
    if (!course) return;
    setSavingSettings(true);
    try {
      const updated = await updateCourse(course.id, values);
      setCourse(updated);
      toast('Ajustes guardados', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const addModule = async () => {
    if (!course) return;
    const title = prompt('Nombre del módulo (sección):', `Módulo ${modules.length + 1}`);
    if (!title?.trim()) return;
    try {
      await createModule(course.id, title.trim(), modules.length);
      await loadCurriculum();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const renameModule = async (m: Module) => {
    const title = prompt('Nuevo nombre del módulo:', m.title);
    if (!title?.trim() || title === m.title) return;
    try {
      await updateModule(m.id, { title: title.trim() });
      await loadCurriculum();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const removeModule = async (m: Module) => {
    if (!confirm(`¿Eliminar el módulo "${m.title}" y todas sus clases?`)) return;
    try {
      await deleteModule(m.id);
      await loadCurriculum();
      toast('Módulo eliminado', 'info');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const moveModule = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= modules.length) return;
    const arr = [...modules];
    [arr[index], arr[next]] = [arr[next], arr[index]];
    setModules(arr);
    try {
      await reorderModules(arr.map((m) => m.id));
    } catch (e: any) {
      toast(e.message, 'error');
      loadCurriculum();
    }
  };

  const moveLesson = async (mod: Module, index: number, dir: -1 | 1) => {
    const lessons = [...(mod.lessons ?? [])];
    const next = index + dir;
    if (next < 0 || next >= lessons.length) return;
    [lessons[index], lessons[next]] = [lessons[next], lessons[index]];
    setModules((prev) => prev.map((m) => (m.id === mod.id ? { ...m, lessons } : m)));
    try {
      await reorderLessons(lessons.map((l) => l.id));
    } catch (e: any) {
      toast(e.message, 'error');
      loadCurriculum();
    }
  };

  const removeLesson = async (l: Lesson) => {
    if (!confirm(`¿Eliminar la clase "${l.title}"?`)) return;
    try {
      await deleteLesson(l.id);
      await loadCurriculum();
      toast('Clase eliminada', 'info');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  if (loading) return <Spinner />;
  if (!course)
    return (
      <Page>
        <Empty icon={<IconSearch size={34} color="#64748B" />} title="Curso no encontrado" cta={{ label: 'Volver', href: '/admin/cursos/' }} />
      </Page>
    );

  const totalLessons = modules.reduce((n, m) => n + (m.lessons?.length ?? 0), 0);

  return (
    <Page>
      <Link href="/admin/cursos/" style={styles.back}>← Cursos</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={styles.title} className="clamp-2">{course.title}</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Pill color={course.status === 'published' ? '#22C55E' : '#F59E0B'}>
              {course.status === 'published' ? 'Publicado' : course.status === 'scheduled' ? 'Programado' : 'Borrador'}
            </Pill>
            <span style={{ color: '#64748B', fontSize: 12 }}>{modules.length} módulos · {totalLessons} clases</span>
          </div>
        </div>
        <Link href={`/curso/?slug=${course.slug}`} style={styles.previewBtn}><IconEye size={14} /> Ver</Link>
      </div>

      {/* TABS */}
      <div style={styles.tabs}>
        {(['contenido', 'tareas', 'ajustes', 'alumnos'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...styles.tab, backgroundColor: tab === t ? '#C7F94C' : '#14161C', color: tab === t ? '#0A0B0E' : '#94A3B8', borderColor: tab === t ? '#C7F94C' : '#1F222B' }}
          >
            {t === 'contenido' ? 'Contenido' : t === 'tareas' ? 'Tareas' : t === 'ajustes' ? 'Ajustes' : 'Alumnos'}
          </button>
        ))}
      </div>

      {/* CONTENIDO */}
      {tab === 'contenido' && (
        <>
          {modules.length === 0 ? (
            <Empty icon={<IconLayers size={34} color="#64748B" />} title="Sin módulos" message="Crea el primer módulo para añadir clases." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {modules.map((m, mi) => (
                <div key={m.id} style={styles.module}>
                  <div style={styles.moduleHead}>
                    <div style={styles.reorder}>
                      <button onClick={() => moveModule(mi, -1)} disabled={mi === 0} style={styles.arrow}>▲</button>
                      <button onClick={() => moveModule(mi, 1)} disabled={mi === modules.length - 1} style={styles.arrow}>▼</button>
                    </div>
                    <span style={styles.moduleIdx}>{mi + 1}</span>
                    <span style={{ flex: 1, color: '#F1F5F9', fontSize: 15, fontWeight: 700 }}>{m.title}</span>
                    <button onClick={() => renameModule(m)} style={styles.iconBtn} aria-label="Renombrar módulo">
                      <IconPencil size={15} />
                    </button>
                    <button onClick={() => removeModule(m)} style={{ ...styles.iconBtn, color: '#FCA5A5' }} aria-label="Eliminar módulo">
                      <IconTrash size={15} />
                    </button>
                  </div>

                  <div style={{ padding: 8 }}>
                    {(m.lessons ?? []).length === 0 && (
                      <p style={{ color: '#64748B', fontSize: 12, textAlign: 'center', padding: '8px 0' }}>Sin clases aún</p>
                    )}
                    {(m.lessons ?? []).map((l, li) => (
                      <div key={l.id} style={styles.lesson}>
                        <div style={styles.reorder}>
                          <button onClick={() => moveLesson(m, li, -1)} disabled={li === 0} style={styles.arrowSm}>▲</button>
                          <button onClick={() => moveLesson(m, li, 1)} disabled={li === (m.lessons?.length ?? 0) - 1} style={styles.arrowSm}>▼</button>
                        </div>
                        <span style={{ color: '#64748B', fontSize: 12, width: 18, textAlign: 'center' }}>{li + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 500 }} className="clamp-2">{l.title}</div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                            {l.is_preview && <span style={{ color: '#C7F94C', fontSize: 10, fontWeight: 600 }}>MUESTRA</span>}
                            {l.release_type === 'scheduled' && <span style={{ color: '#3B82F6', fontSize: 10, fontWeight: 600 }}>PROGRAMADA</span>}
                            {l.release_type === 'drip_days' && <span style={{ color: '#F59E0B', fontSize: 10, fontWeight: 600 }}>GOTEO +{l.drip_days}d</span>}
                            {l.duration && <span style={{ color: '#64748B', fontSize: 10 }}>{l.duration}</span>}
                          </div>
                        </div>
                        <button onClick={() => setEditing({ moduleId: m.id, lesson: l })} style={styles.iconBtn} aria-label="Editar clase">
                          <IconPencil size={15} />
                        </button>
                        <button onClick={() => removeLesson(l)} style={{ ...styles.iconBtn, color: '#FCA5A5' }} aria-label="Eliminar clase">
                          <IconTrash size={15} />
                        </button>
                      </div>
                    ))}

                    <button onClick={() => setEditing({ moduleId: m.id })} style={styles.addLesson}>
                      + Añadir clase
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="ghost" full onClick={addModule} style={{ marginTop: 16 }}>
            + Nuevo módulo
          </Button>
        </>
      )}

      {/* TAREAS */}
      {tab === 'tareas' && <CourseAssignments courseId={course.id} />}

      {/* AJUSTES */}
      {tab === 'ajustes' && (
        <div style={styles.panel}>
          <CourseForm initial={course} onSubmit={saveSettings} submitLabel="Guardar ajustes" busy={savingSettings} />
        </div>
      )}

      {/* ALUMNOS */}
      {tab === 'alumnos' && <CourseStudents courseId={course.id} />}

      {/* EDITOR DE CLASE */}
      {editing && course && (
        <LessonEditor
          courseId={course.id}
          moduleId={editing.moduleId}
          lesson={editing.lesson}
          position={modules.find((m) => m.id === editing.moduleId)?.lessons?.length ?? 0}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await loadCurriculum();
          }}
        />
      )}
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  back: { color: '#94A3B8', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 12 },
  title: { color: '#F1F5F9', fontSize: 22, fontWeight: 800, margin: 0, lineHeight: '27px', fontFamily: 'var(--font-bricolage), sans-serif', letterSpacing: -0.4 },
  previewBtn: { flexShrink: 0, backgroundColor: '#1F222B', color: '#F1F5F9', fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 9, textDecoration: 'none' },
  tabs: { display: 'flex', gap: 8, margin: '18px 0 18px' },
  tab: { flex: 1, textAlign: 'center', border: '1px solid', borderRadius: 10, padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  module: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 14, overflow: 'hidden' },
  moduleHead: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #1F222B' },
  reorder: { display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 },
  arrow: { background: 'transparent', border: '1px solid #1F222B', borderRadius: 5, color: '#94A3B8', fontSize: 9, width: 22, height: 16, cursor: 'pointer', lineHeight: 1 },
  arrowSm: { background: 'transparent', border: '1px solid #1F222B', borderRadius: 4, color: '#64748B', fontSize: 8, width: 18, height: 14, cursor: 'pointer', lineHeight: 1 },
  moduleIdx: { width: 22, height: 22, borderRadius: 6, backgroundColor: 'rgba(199,249,76,0.15)', color: '#C7F94C', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  iconBtn: { background: 'transparent', border: 'none', color: '#94A3B8', fontSize: 14, cursor: 'pointer', padding: 4, flexShrink: 0 },
  lesson: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', borderBottom: '1px solid #14161C' },
  addLesson: { display: 'block', width: '100%', marginTop: 6, background: 'transparent', border: '1px dashed #262932', color: '#C7F94C', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  panel: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 14, padding: 16 },
};
