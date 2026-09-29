'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { listAllCourses } from '@/lib/courses';
import type { Course } from '@/lib/supabase';
import { Page, PageTitle, Card, Spinner, Pill } from '@/components/ui';
import { AdminNav } from '@/components/AdminNav';

export default function AdminDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<number | null>(null);
  const [enrollments, setEnrollments] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const [cs, studentsRes, enrRes] = await Promise.all([
          listAllCourses(),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('enrollments').select('id', { count: 'exact', head: true }),
        ]);
        setCourses(cs);
        setStudents(studentsRes.count ?? 0);
        setEnrollments(enrRes.count ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const published = courses.filter((c) => c.status === 'published').length;
  const drafts = courses.filter((c) => c.status !== 'published').length;

  return (
    <Page>
      <PageTitle title="Master Study" subtitle="Panel de administración de la academia" />
      <AdminNav />

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div style={styles.stats}>
            <Stat label="Cursos" value={courses.length} accent />
            <Stat label="Publicados" value={published} />
            <Stat label="Borradores" value={drafts} />
            <Stat label="Alumnos" value={students ?? 0} />
            <Stat label="Inscripciones" value={enrollments ?? 0} />
          </div>

          <div style={styles.actions}>
            <Link href="/admin/cursos/nuevo" style={styles.primaryAction}>
              + Crear nuevo curso
            </Link>
            <Link href="/admin/cursos" style={styles.secondaryAction}>
              Gestionar cursos
            </Link>
          </div>

          <h2 style={styles.h2}>Cursos recientes</h2>
          {courses.length === 0 ? (
            <p style={{ color: '#64748B', fontSize: 13 }}>Todavía no hay cursos. Crea el primero.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {courses.slice(0, 6).map((c) => (
                <Link key={c.id} href={`/admin/cursos/${c.id}`} style={{ textDecoration: 'none' }}>
                  <Card style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                    <div style={styles.dot(c.status)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#F1F5F9', fontSize: 14, fontWeight: 600 }} className="clamp-2">
                        {c.title}
                      </div>
                      <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{c.category}</div>
                    </div>
                    <Pill color={c.status === 'published' ? '#22C55E' : '#F59E0B'}>
                      {c.status === 'published' ? 'Publicado' : c.status === 'scheduled' ? 'Programado' : 'Borrador'}
                    </Pill>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{ ...styles.stat, borderColor: accent ? 'rgba(199,249,76,0.4)' : '#1F222B' }}>
      <div style={{ color: accent ? '#C7F94C' : '#F1F5F9', fontSize: 24, fontWeight: 800 }}>{value}</div>
      <div style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>{label}</div>
    </div>
  );
}

const styles: Record<string, any> = {
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, marginBottom: 20 },
  stat: { backgroundColor: '#14161C', border: '1px solid #1F222B', borderRadius: 12, padding: '14px 12px', textAlign: 'center' },
  actions: { display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' },
  primaryAction: {
    flex: 1,
    minWidth: 160,
    textAlign: 'center',
    backgroundColor: '#C7F94C',
    color: '#0A0B0E',
    fontWeight: 700,
    fontSize: 14,
    padding: '13px',
    borderRadius: 10,
    textDecoration: 'none',
  },
  secondaryAction: {
    flex: 1,
    minWidth: 160,
    textAlign: 'center',
    backgroundColor: '#1F222B',
    color: '#F1F5F9',
    fontWeight: 600,
    fontSize: 14,
    padding: '13px',
    borderRadius: 10,
    textDecoration: 'none',
  },
  h2: { color: '#F1F5F9', fontSize: 16, fontWeight: 700, margin: '0 0 12px', fontFamily: 'var(--font-bricolage), sans-serif' },
  dot: (status: string): React.CSSProperties => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor: status === 'published' ? '#22C55E' : status === 'scheduled' ? '#3B82F6' : '#F59E0B',
  }),
};
