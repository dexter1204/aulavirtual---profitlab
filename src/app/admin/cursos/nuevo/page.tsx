'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCourse } from '@/lib/courses';
import { Page, PageTitle, Card } from '@/components/ui';
import { CourseForm, type CourseFormValues } from '@/components/CourseForm';
import { useToast } from '@/components/Toast';

export default function NewCoursePage() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleCreate = async (values: CourseFormValues) => {
    setBusy(true);
    try {
      const course = await createCourse(values);
      toast('Curso creado. Ahora añade su contenido.', 'success');
      router.replace(`/admin/curso/?id=${course.id}`);
    } catch (e: any) {
      toast(e?.message ?? 'No se pudo crear el curso', 'error');
      setBusy(false);
    }
  };

  return (
    <Page>
      <Link href="/admin/cursos" style={{ color: '#94A3B8', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}>
        ← Cursos
      </Link>
      <PageTitle title="Nuevo curso" subtitle="Después podrás añadir módulos y clases" />
      <Card>
        <CourseForm onSubmit={handleCreate} submitLabel="Crear curso" busy={busy} />
      </Card>
    </Page>
  );
}
