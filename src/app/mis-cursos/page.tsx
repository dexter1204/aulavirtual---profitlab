'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listMyEnrollments } from '@/lib/enrollments';
import { getCurriculum } from '@/lib/courses';
import { getCourseProgress, countCompleted } from '@/lib/progress';
import type { Course } from '@/lib/supabase';
import { CourseCard } from '@/components/CourseCard';
import { Page, PageTitle, Spinner, Empty } from '@/components/ui';

type Item = { course: Course; done: number; total: number };

export default function MyCoursesPage() {
  const { session } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const enrollments = await listMyEnrollments(session.user.id);
        const withProgress = await Promise.all(
          enrollments
            .filter((e) => e.course)
            .map(async (e) => {
              const course = e.course as Course;
              const [mods, prog] = await Promise.all([
                getCurriculum(course.id),
                getCourseProgress(session.user.id, course.id),
              ]);
              const total = mods.reduce((n, m) => n + (m.lessons?.length ?? 0), 0);
              return { course, done: countCompleted(prog), total };
            })
        );
        setItems(withProgress);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  return (
    <Page>
      <PageTitle title="Mis cursos" subtitle="Continúa donde lo dejaste" />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty
          icon="🎓"
          title="Aún no estás inscrito en ningún curso"
          message="Explora el catálogo e inscríbete para empezar a aprender."
          cta={{ label: 'Ver catálogo', href: '/cursos' }}
        />
      ) : (
        <div style={styles.grid}>
          {items.map(({ course, done, total }) => (
            <CourseCard
              key={course.id}
              course={course}
              href={`/curso/?slug=${course.slug}`}
              progress={{ done, total }}
              badge={total > 0 && done === total ? 'Completado' : undefined}
            />
          ))}
        </div>
      )}
    </Page>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
};
