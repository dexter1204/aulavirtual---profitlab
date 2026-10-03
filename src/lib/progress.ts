import { api } from './api';

/** Progreso del usuario para un curso: mapa lesson_id → completado. */
export async function getCourseProgress(
  _userId: string,
  courseId: string
): Promise<Record<string, boolean>> {
  return api<Record<string, boolean>>(`/progress/${courseId}`);
}

/** Marca (o desmarca) una clase como completada. */
export async function setLessonCompleted(
  _userId: string,
  courseId: string,
  lessonId: string,
  completed: boolean
): Promise<void> {
  await api('/progress', {
    method: 'POST',
    body: { course_id: courseId, lesson_id: lessonId, completed },
  });
}

export function countCompleted(progress: Record<string, boolean>): number {
  return Object.values(progress).filter(Boolean).length;
}
