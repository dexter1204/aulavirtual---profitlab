// ============================================================
// Cliente de la API REST (PHP + MySQL)
// ============================================================

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '/api').replace(/\/$/, '');
const TOKEN_KEY = 'pl_token';

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

/** URL absoluta usable en el navegador para un material (rutas root-relative tal cual). */
export function materialHref(url: string): string {
  return url;
}

// Usuarios (admin)
export async function listUsers(): Promise<UserRow[]> {
  return api<UserRow[]>('/users');
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  await api(`/users/${userId}/role`, { method: 'PUT', body: { role } });
}

export async function getAdminStats(): Promise<AdminStats> {
  return api<AdminStats>('/stats');
}
