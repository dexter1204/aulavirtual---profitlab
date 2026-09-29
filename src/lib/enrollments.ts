import { createClient, type Enrollment } from './supabase';

/** Inscripción del usuario actual en un curso (mediante RPC seguro). */
export async function enrollMe(courseId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('enroll_me', { course: courseId });
  if (error) throw error;
}

/** Cancela la inscripción del usuario actual. */
export async function unenrollMe(courseId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('course_id', courseId)
    .eq('user_id', userId);
  if (error) throw error;
}

/** ¿Está el usuario inscrito? Devuelve la inscripción o null. */
export async function getMyEnrollment(courseId: string, userId: string): Promise<Enrollment | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Enrollment) ?? null;
}

/** Cursos en los que el usuario está inscrito (con datos del curso). */
export async function listMyEnrollments(userId: string): Promise<Enrollment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Enrollment[];
}

// ============================================================
// ADMIN
// ============================================================

/** Inscripciones de un curso, con datos del alumno. */
export async function listCourseEnrollments(courseId: string): Promise<Enrollment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, profile:profiles(id, name, email, avatar_url)')
    .eq('course_id', courseId)
    .order('enrolled_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Enrollment[];
}

/** Inscribe manualmente a un alumno (admin). */
export async function adminEnroll(userId: string, courseId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('enrollments')
    .upsert({ user_id: userId, course_id: courseId }, { onConflict: 'user_id,course_id' });
  if (error) throw error;
}

export async function adminUnenroll(enrollmentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId);
  if (error) throw error;
}
