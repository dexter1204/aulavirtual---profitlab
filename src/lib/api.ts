// ============================================================
// Cliente de la API REST (PHP + MySQL)
// ============================================================

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');
const TOKEN_KEY = 'pl_token';

// Origen del servidor (solo cuando la API es absoluta, p. ej. en la app
// nativa de Capacitor). En la web queda vacío y las rutas relativas se usan
// tal cual. Sirve para que los archivos subidos (/aulavirtual/uploads/…) se
// abran contra el dominio real desde el WebView.
const API_ORIGIN = /^https?:\/\//i.test(API_BASE) ? new URL(API_BASE).origin : '';

// ---------- Token (localStorage) ----------
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

// ---------- Fetch helper ----------
type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, query } = opts;

  let url = `${API_BASE}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Nunca servir desde la caché del navegador: tras crear/editar módulos o
      // clases, la lista debe reflejar el cambio al instante.
      cache: 'no-store',
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message = (data && (data.error as string)) || `Error ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ============================================================
// TIPOS COMPARTIDOS
// ============================================================

export type Role = 'admin' | 'student';

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseStatus = 'draft' | 'published' | 'scheduled';
export type CourseLevel = 'principiante' | 'intermedio' | 'avanzado';
export type AccessType = 'free' | 'enrollment';

export type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  level: CourseLevel;
  instructor: string;
  status: CourseStatus;
  published_at: string | null;
  access_type: AccessType;
  price: number;
  currency: string;
  position: number;
  created_at: string;
  updated_at: string;
  students?: number;
  modules?: Module[];
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at?: string;
  lessons?: Lesson[];
};

export type ReleaseType = 'immediate' | 'scheduled' | 'drip_days';

export type Lesson = {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  video_provider?: 'youtube' | 'drive';
  duration: string | null;
  position: number;
  is_preview: boolean;
  release_type: ReleaseType;
  release_at: string | null;
  drip_days: number | null;
  resources: string | null;
  created_at?: string;
};

export type Material = {
  id: string;
  lesson_id: string;
  course_id: string;
  kind: 'file' | 'link';
  title: string;
  url: string;
  mime: string | null;
  size: number | null;
  position: number;
  created_at: string;
};

// ---------- Tareas (assignments) ----------
export type SubmissionFile = {
  id: string;
  submission_id: string;
  title: string;
  url: string;
  mime: string | null;
  size: number | null;
  created_at: string;
};

export type SubmissionStatus = 'entregada' | 'revisada';

export type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  comment: string | null;
  status: SubmissionStatus;
  grade: string | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
  files?: SubmissionFile[];
  user_name?: string;
  user_email?: string;
};

export type Assignment = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
};

export type Enrollment = {
  id: string;
  user_id: string;
  course_id: string;
  status: 'active' | 'completed';
  enrolled_at: string;
  completed_at: string | null;
  course?: Course;
  profile?: Pick<Profile, 'id' | 'name' | 'email' | 'avatar_url'>;
};

export type LessonProgress = {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

export type Purchase = {
  id: string;
  user_id: string;
  course_id: string | null;
  course_title: string;
  amount: number;
  currency: string;
  status: 'completed' | 'refunded';
  created_at: string;
};

// Usuario con conteo de inscripciones (panel admin)
export type UserRow = Profile & { enrollments: number };

export type AdminStats = {
  courses: number;
  published: number;
  drafts: number;
  students: number;
  enrollments: number;
};

// ============================================================
// AUTENTICACIÓN
// ============================================================

export async function apiSignup(name: string, email: string, password: string) {
  const res = await api<{ token: string; profile: Profile }>('/auth/signup', {
    method: 'POST',
    body: { name, email, password },
  });
  setToken(res.token);
  return res.profile;
}

export async function apiLogin(email: string, password: string) {
  const res = await api<{ token: string; profile: Profile }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setToken(res.token);
  return res.profile;
}

export async function apiMe(): Promise<Profile> {
  return api<Profile>('/auth/me');
}

export async function updateMyProfile(name: string): Promise<void> {
  await api('/profile', { method: 'PUT', body: { name } });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api('/profile/password', {
    method: 'PUT',
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export async function listMyPurchases(): Promise<Purchase[]> {
  return api<Purchase[]>('/purchases/me');
}

// ============================================================
// MATERIALES (documentos, archivos, enlaces)
// ============================================================

export async function listLessonMaterials(lessonId: string): Promise<Material[]> {
  return api<Material[]>(`/lessons/${lessonId}/materials`);
}

export async function createMaterial(input: {
  lesson_id: string;
  course_id: string;
  kind: 'file' | 'link';
  title: string;
  url: string;
  mime?: string | null;
  size?: number | null;
}): Promise<string> {
  const { id } = await api<{ id: string }>('/materials', { method: 'POST', body: input });
  return id;
}

export async function deleteMaterial(id: string): Promise<void> {
  await api(`/materials/${id}`, { method: 'DELETE' });
}

/** Sube un archivo (multipart) y devuelve su URL pública y metadatos. */
export async function uploadFile(
  file: File
): Promise<{ url: string; name: string; mime: string | null; size: number }> {
  const fd = new FormData();
  fd.append('file', file);
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) throw new Error((data && (data.error as string)) || `Error ${res.status}`);
  return data;
}

/** URL usable en el navegador/app para un material o archivo subido.
 *  En la web deja las rutas relativas tal cual; en la app nativa (API
 *  absoluta) les antepone el dominio para que abran contra el servidor. */
export function materialHref(url: string): string {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (API_ORIGIN && url.startsWith('/')) return API_ORIGIN + url;
  return url;
}

// Usuarios (admin)
export async function listUsers(): Promise<UserRow[]> {
  return api<UserRow[]>('/users');
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  await api(`/users/${userId}/role`, { method: 'PUT', body: { role } });
}

/** Restablece la contraseña de un usuario (solo admin). Devuelve la clave temporal fijada. */
export async function adminResetPassword(userId: string, newPassword: string): Promise<void> {
  await api(`/users/${userId}/password`, { method: 'PUT', body: { new_password: newPassword } });
}

export async function getAdminStats(): Promise<AdminStats> {
  return api<AdminStats>('/stats');
}

// ============================================================
// CURSO · stats públicas y pagos (Mercado Pago)
// ============================================================

export async function getCourseStats(courseId: string): Promise<{ students: number }> {
  return api<{ students: number }>(`/courses/${courseId}/stats`);
}

/** Inicia el checkout de Mercado Pago y devuelve el enlace de pago. */
export async function startCheckout(courseId: string): Promise<{ init_point: string }> {
  return api<{ init_point: string }>('/checkout', { method: 'POST', body: { course_id: courseId } });
}

/** Verifica un pago tras volver de Mercado Pago (da acceso al instante). */
export async function verifyPayment(paymentId: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>('/mp/verify', { method: 'POST', body: { payment_id: paymentId } });
}

// ============================================================
// TAREAS (assignments) · alumnos suben archivos; admin califica
// ============================================================

/** Lista las tareas de un curso (admin o alumno inscrito). */
export async function listAssignments(courseId: string): Promise<Assignment[]> {
  return api<Assignment[]>('/assignments', { query: { course_id: courseId } });
}

export async function createAssignment(input: {
  course_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  position?: number;
}): Promise<string> {
  const { id } = await api<{ id: string }>('/assignments', { method: 'POST', body: input });
  return id;
}

export async function updateAssignment(
  id: string,
  input: Partial<Pick<Assignment, 'title' | 'description' | 'due_date' | 'position'>>
): Promise<void> {
  await api(`/assignments/${id}`, { method: 'PUT', body: input });
}

export async function deleteAssignment(id: string): Promise<void> {
  await api(`/assignments/${id}`, { method: 'DELETE' });
}

/** Todas las entregas de una tarea con sus archivos (solo admin). */
export async function listAssignmentSubmissions(assignmentId: string): Promise<Submission[]> {
  return api<Submission[]>(`/assignments/${assignmentId}/submissions`);
}

/** La entrega del alumno autenticado para una tarea (o null). */
export async function getMySubmission(assignmentId: string): Promise<Submission | null> {
  return api<Submission | null>(`/assignments/${assignmentId}/my-submission`);
}

/** Sube UN archivo de la entrega (multipart) y devuelve su URL y metadatos. */
export async function uploadSubmissionFile(
  assignmentId: string,
  file: File
): Promise<{ url: string; name: string; mime: string | null; size: number }> {
  const fd = new FormData();
  fd.append('file', file);
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/assignments/${assignmentId}/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) throw new Error((data && (data.error as string)) || `Error ${res.status}`);
  return data;
}

/** Crea o actualiza la entrega del alumno (comentario + lista de archivos ya subidos). */
export async function submitAssignment(
  assignmentId: string,
  input: { comment?: string | null; files: { title: string; url: string; mime?: string | null; size?: number | null }[] }
): Promise<string> {
  const { id } = await api<{ id: string }>(`/assignments/${assignmentId}/submit`, {
    method: 'POST',
    body: input,
  });
  return id;
}

/** Califica / marca como revisada una entrega (solo admin). */
export async function gradeSubmission(
  submissionId: string,
  input: Partial<Pick<Submission, 'status' | 'grade' | 'feedback'>>
): Promise<void> {
  await api(`/submissions/${submissionId}`, { method: 'PUT', body: input });
}
