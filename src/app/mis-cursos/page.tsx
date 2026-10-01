'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { listMyEnrollments } from '@/lib/enrollments';
import { getCurriculum } from '@/lib/courses';
import { getCourseProgress, countCompleted } from '@/lib/progress';
import { verifyPayment, type Course } from '@/lib/api';
import { CourseCard } from '@/components/CourseCard';
import { Page, PageTitle, Spinner, Empty } from '@/components/ui';
import { IconGraduation } from '@/components/icons';
import { useToast } from '@/components/Toast';

type Item = { course: Course; done: number; total: number };

export default function MyCoursesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <MyCourses />
    </Suspense>
  );
}

function MyCourses() {
  const { session } = useAuth();
  const search = useSearchParams();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (userId: string) => {
    const enrollments = await listMyEnrollments(userId);
    const withProgress = await Promise.all(
      enrollments
        .filter((e) => e.course)
        .map(async (e) => {
          const course = e.course as Course;
          const [mods, prog] = await Promise.all([
            getCurriculum(course.id),
            getCourseProgress(userId, course.id),
          ]);
          const total = mods.reduce((n, m) => n + (m.lessons?.length ?? 0), 0);
          return { course, done: countCompleted(prog), total };
        })
    );
    setItems(withProgress);
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        // Retorno de Mercado Pago: confirmar el pago para dar acceso al instante
        const pago = search.get('pago');
        const paymentId = search.get('payment_id') || search.get('collection_id');
        if (pago === 'ok' && paymentId) {
          try {
            const { ok } = await verifyPayment(paymentId);
            toast(ok ? '¡Pago aprobado! Ya tienes acceso al curso.' : 'Pago recibido, se activará en breve.', ok ? 'success' : 'info');
          } catch {
            toast('Estamos confirmando tu pago…', 'info');
          }
        } else if (pago === 'pendiente') {
          toast('Tu pago quedó pendiente. Te daremos acceso al aprobarse.', 'info');
        }
        await load(session.user.id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <Page>
      <PageTitle title="Mis cursos" subtitle="Continúa donde lo dejaste" />
      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty
          icon={<IconGraduation size={36} color="#64748B" />}
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
