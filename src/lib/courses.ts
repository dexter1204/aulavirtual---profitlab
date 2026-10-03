import { api, type Course, type Module, type Lesson } from './api';

// ============================================================
// LECTURA
// ============================================================

export async function listPublishedCourses(): Promise<Course[]> {
  return api<Course[]>('/courses');
}

export async function listAllCourses(): Promise<Course[]> {
  return api<Course[]>('/courses', { query: { all: 1 } });
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  return api<Course | null>('/courses', { query: { slug } });
}

export async function getCourseById(id: string): Promise<Course | null> {
  return api<Course | null>(`/courses/${id}`);
}

/** Currículo: módulos con sus clases, ordenados. */
export async function getCurriculum(courseId: string): Promise<Module[]> {
  return api<Module[]>(`/courses/${courseId}/curriculum`);
}

// ============================================================
// CURSOS (admin)
// ============================================================

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

export async function createCourse(input: Partial<Course> & { title: string }): Promise<Course> {
  return api<Course>('/courses', { method: 'POST', body: input });
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<Course> {
  const { modules, id: _omit, created_at, updated_at, position, ...clean } = patch as any;
  return api<Course>(`/courses/${id}`, { method: 'PUT', body: clean });
}

export async function deleteCourse(id: string): Promise<void> {
  await api(`/courses/${id}`, { method: 'DELETE' });
}

export async function reorderCourses(orderedIds: string[]): Promise<void> {
  await api('/courses/reorder', { method: 'POST', body: { ids: orderedIds } });
}

// ============================================================
// MÓDULOS (admin)
// ============================================================

export async function createModule(courseId: string, title: string, position: number): Promise<Module> {
  const { id } = await api<{ id: string }>('/modules', {
    method: 'POST',
    body: { course_id: courseId, title, position },
  });
  return { id, course_id: courseId, title, position };
}

export async function updateModule(id: string, patch: Partial<Module>): Promise<void> {
  await api(`/modules/${id}`, { method: 'PUT', body: { title: patch.title } });
}

export async function deleteModule(id: string): Promise<void> {
  await api(`/modules/${id}`, { method: 'DELETE' });
}

export async function reorderModules(orderedIds: string[]): Promise<void> {
  await api('/modules/reorder', { method: 'POST', body: { ids: orderedIds } });
}

// ============================================================
// CLASES / LESSONS (admin)
// ============================================================

export async function createLesson(input: Omit<Lesson, 'id' | 'created_at'>): Promise<Lesson> {
  const { id } = await api<{ id: string }>('/lessons', { method: 'POST', body: input });
  return { ...(input as any), id };
}

export async function updateLesson(id: string, patch: Partial<Lesson>): Promise<void> {
  const { id: _i, created_at, ...clean } = patch as any;
  await api(`/lessons/${id}`, { method: 'PUT', body: clean });
}

export async function deleteLesson(id: string): Promise<void> {
  await api(`/lessons/${id}`, { method: 'DELETE' });
}

export async function reorderLessons(orderedIds: string[]): Promise<void> {
  await api('/lessons/reorder', { method: 'POST', body: { ids: orderedIds } });
}

// ============================================================
// LANZAMIENTO / GOTEO (drip)
// ============================================================

export function isLessonReleased(
  lesson: Pick<Lesson, 'release_type' | 'release_at' | 'drip_days'>,
  enrolledAt: string | null,
  isAdmin = false
): { released: boolean; availableAt: Date | null } {
  if (isAdmin) return { released: true, availableAt: null };

  if (lesson.release_type === 'scheduled' && lesson.release_at) {
    const at = new Date(lesson.release_at.replace(' ', 'T'));
    return { released: Date.now() >= at.getTime(), availableAt: at };
  }

  if (lesson.release_type === 'drip_days' && lesson.drip_days && enrolledAt) {
    const at = new Date(new Date(enrolledAt.replace(' ', 'T')).getTime() + lesson.drip_days * 86400000);
    return { released: Date.now() >= at.getTime(), availableAt: at };
  }

  return { released: true, availableAt: null };
}
