import { createClient, type LessonProgress } from './supabase';

/** Progreso del usuario para un curso: mapa lesson_id → completado. */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<Record<string, boolean>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed')
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (error) throw error;
  const map: Record<string, boolean> = {};
  for (const row of (data ?? []) as Pick<LessonProgress, 'lesson_id' | 'completed'>[]) {
    map[row.lesson_id] = row.completed;
  }
  return map;
}

/** Marca (o desmarca) una clase como completada. */
export async function setLessonCompleted(
  userId: string,
  courseId: string,
  lessonId: string,
  completed: boolean
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('lesson_progress').upsert(
    {
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' }
  );
  if (error) throw error;
}

/** Cuenta cuántas clases completó el usuario en un curso. */
export function countCompleted(progress: Record<string, boolean>): number {
  return Object.values(progress).filter(Boolean).length;
}
