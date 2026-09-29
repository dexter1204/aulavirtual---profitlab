import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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
  position: number;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales (cargadas por consulta)
  modules?: Module[];
  lesson_count?: number;
};

export type Module = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
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
