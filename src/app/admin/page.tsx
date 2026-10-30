'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listAllCourses } from '@/lib/courses';
import { getAdminStats, type Course } from '@/lib/api';
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
        const [cs, stats] = await Promise.all([listAllCourses(), getAdminStats()]);
        setCourses(cs);
        setStudents(stats.students);
        setEnrollments(stats.enrollments);
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
            <Link href="/admin/cursos/nuevo" className="pl-pressable" style={styles.primaryAction}>
              + Crear nuevo curso
            </Link>
            <Link href="/admin/cursos" className="pl-pressable" style={styles.secondaryAction}>
              Gestionar cursos
            </Link>
          </div>

          <h2 className="pl-title" style={styles.h2}>Cursos recientes</h2>
          {courses.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Todavía no hay cursos. Crea el primero.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {courses.slice(0, 6).map((c) => (
                <Link key={c.id} href={`/admin/curso/?id=${c.id}`} style={{ textDecoration: 'none' }}>
                  <Card interactive style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                    <div style={styles.dot(c.status)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600 }} className="clamp-2">
                        {c.title}
                      </div>
                      <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{c.category}</div>
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
    <div style={{ ...styles.stat, borderColor: accent ? 'rgba(199,249,76,0.4)' : 'var(--border)' }}>
      <div style={{ color: accent ? 'var(--primary)' : 'var(--text)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4 }}>{label}</div>
    </div>
  );
}

const styles: Record<string, any> = {
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, marginBottom: 20 },
  stat: { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '14px 12px', textAlign: 'center', boxShadow: 'var(--shadow-card)' },
  actions: { display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' },
  primaryAction: {
    flex: 1,
    minWidth: 160,
    textAlign: 'center',
    backgroundColor: 'var(--primary)',
    color: 'var(--bg)',
    fontWeight: 700,
    fontSize: 14,
    padding: '13px',
    borderRadius: 'var(--r-sm)',
    textDecoration: 'none',
    boxShadow: '0 1px 0 rgba(255,255,255,0.25) inset',
  },
  secondaryAction: {
    flex: 1,
    minWidth: 160,
    textAlign: 'center',
    backgroundColor: 'var(--surface-hi)',
    color: 'var(--text)',
    fontWeight: 600,
    fontSize: 14,
    padding: '13px',
    borderRadius: 'var(--r-sm)',
    textDecoration: 'none',
    border: '1px solid var(--border)',
  },
  h2: { color: 'var(--text)', fontSize: 16, margin: '0 0 12px' },
  dot: (status: string): React.CSSProperties => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    backgroundColor: status === 'published' ? '#22C55E' : status === 'scheduled' ? '#3B82F6' : '#F59E0B',
  }),
};
