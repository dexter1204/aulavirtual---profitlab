import { api, type Enrollment } from './api';

/** Inscripción del usuario actual en un curso (auto-inscripción). */
export async function enrollMe(courseId: string): Promise<void> {
  await api('/enroll', { method: 'POST', body: { course_id: courseId } });
}

/** Cancela la inscripción del usuario actual. (userId se ignora: lo resuelve el token) */
export async function unenrollMe(courseId: string, _userId?: string): Promise<void> {
  await api(`/enroll/${courseId}`, { method: 'DELETE' });
}

/** Inscripción del usuario actual para un curso, o null. */
export async function getMyEnrollment(courseId: string, _userId?: string): Promise<Enrollment | null> {
  return api<Enrollment | null>(`/my-enrollment/${courseId}`);
}

/** Cursos en los que el usuario está inscrito (con datos del curso). */
export async function listMyEnrollments(_userId?: string): Promise<Enrollment[]> {
  return api<Enrollment[]>('/enrollments/me');
}

// ============================================================
// ADMIN
// ============================================================

export async function listCourseEnrollments(courseId: string): Promise<Enrollment[]> {
  return api<Enrollment[]>(`/courses/${courseId}/enrollments`);
}

export async function adminEnroll(userId: string, courseId: string): Promise<void> {
  await api(`/courses/${courseId}/enrollments`, { method: 'POST', body: { user_id: userId } });
}

export async function adminUnenroll(enrollmentId: string): Promise<void> {
  await api(`/enrollments/${enrollmentId}`, { method: 'DELETE' });
}
