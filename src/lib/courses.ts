import { createClient, type Course, type Module, type Lesson } from './supabase';

// ============================================================
// LECTURA
// ============================================================

/** Catálogo público (solo cursos publicados). */
export async function listPublishedCourses(): Promise<Course[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'published')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

/** Todos los cursos (admin — incluye borradores). */
export async function listAllCourses(): Promise<Course[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('courses').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return (data as Course) ?? null;
}

export async function getCourseById(id: string): Promise<Course | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from('courses').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Course) ?? null;
}

/** Currículo completo: módulos con sus clases, ordenados. */
export async function getCurriculum(courseId: string): Promise<Module[]> {
  const supabase = createClient();
  const { data: modules, error: mErr } = await supabase
    .from('modules')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true });
  if (mErr) throw mErr;

  const { data: lessons, error: lErr } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('position', { ascending: true });
  if (lErr) throw lErr;

  const byModule = new Map<string, Lesson[]>();
  for (const l of (lessons ?? []) as Lesson[]) {
    const arr = byModule.get(l.module_id) ?? [];
    arr.push(l);
    byModule.set(l.module_id, arr);
  }

  return ((modules ?? []) as Module[]).map((m) => ({
    ...m,
    lessons: byModule.get(m.id) ?? [],
  }));
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
  const supabase = createClient();
  const base = slugify(input.slug || input.title) || 'curso';
  // Garantiza slug único añadiendo sufijo corto si ya existe.
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await supabase
    .from('courses')
    .insert({
      title: input.title,
      slug,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      thumbnail_url: input.thumbnail_url ?? null,
      category: input.category ?? 'General',
      level: input.level ?? 'principiante',
      instructor: input.instructor ?? 'Profit Lab',
      status: input.status ?? 'draft',
      published_at: input.published_at ?? null,
      access_type: input.access_type ?? 'free',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Course;
}

export async function updateCourse(id: string, patch: Partial<Course>): Promise<Course> {
  const supabase = createClient();
  const { modules, lesson_count, id: _omit, created_at, updated_at, ...clean } = patch as any;
  const { data, error } = await supabase.from('courses').update(clean).eq('id', id).select().single();
  if (error) throw error;
  return data as Course;
}

export async function deleteCourse(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderCourses(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    orderedIds.map((id, i) => supabase.from('courses').update({ position: i }).eq('id', id))
  );
}

// ============================================================
// MÓDULOS (admin)
// ============================================================

export async function createModule(courseId: string, title: string, position: number): Promise<Module> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('modules')
    .insert({ course_id: courseId, title, position })
    .select()
    .single();
  if (error) throw error;
  return data as Module;
}

export async function updateModule(id: string, patch: Partial<Module>): Promise<void> {
  const supabase = createClient();
  const { data: _d, lessons, id: _i, created_at, ...clean } = patch as any;
  const { error } = await supabase.from('modules').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deleteModule(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('modules').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderModules(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    orderedIds.map((id, i) => supabase.from('modules').update({ position: i }).eq('id', id))
  );
}

// ============================================================
// CLASES / LESSONS (admin)
// ============================================================

export async function createLesson(
  input: Omit<Lesson, 'id' | 'created_at'>
): Promise<Lesson> {
  const supabase = createClient();
  const { data, error } = await supabase.from('lessons').insert(input).select().single();
  if (error) throw error;
  return data as Lesson;
}

export async function updateLesson(id: string, patch: Partial<Lesson>): Promise<void> {
  const supabase = createClient();
  const { id: _i, created_at, ...clean } = patch as any;
  const { error } = await supabase.from('lessons').update(clean).eq('id', id);
  if (error) throw error;
}

export async function deleteLesson(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('lessons').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderLessons(orderedIds: string[]): Promise<void> {
  const supabase = createClient();
  await Promise.all(
    orderedIds.map((id, i) => supabase.from('lessons').update({ position: i }).eq('id', id))
  );
}

// ============================================================
// LANZAMIENTO / GOTEO (drip)
// ============================================================

/**
 * Determina si una clase está liberada para un alumno según su regla de goteo.
 * `enrolledAt` es la fecha de inscripción del alumno (ISO). Admin ve todo.
 */
export function isLessonReleased(
  lesson: Pick<Lesson, 'release_type' | 'release_at' | 'drip_days'>,
  enrolledAt: string | null,
  isAdmin = false
): { released: boolean; availableAt: Date | null } {
  if (isAdmin) return { released: true, availableAt: null };

  if (lesson.release_type === 'scheduled' && lesson.release_at) {
    const at = new Date(lesson.release_at);
    return { released: Date.now() >= at.getTime(), availableAt: at };
  }

  if (lesson.release_type === 'drip_days' && lesson.drip_days && enrolledAt) {
    const at = new Date(new Date(enrolledAt).getTime() + lesson.drip_days * 86400000);
    return { released: Date.now() >= at.getTime(), availableAt: at };
  }

  return { released: true, availableAt: null };
}
