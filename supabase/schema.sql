-- ============================================================
-- PROFIT LAB · AULA VIRTUAL
-- Esquema completo de base de datos para Supabase (PostgreSQL)
-- ------------------------------------------------------------
-- Ejecuta este archivo en:  Supabase Dashboard → SQL Editor → New query
-- Es idempotente: puedes correrlo varias veces sin romper nada.
-- ============================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES  (usuarios de la academia)
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text        not null default 'Estudiante',
  email       text        not null,
  role        text        not null default 'student' check (role in ('admin', 'student')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- 2. COURSES  (cursos de la academia)
-- ============================================================
create table if not exists public.courses (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null,
  slug         text        not null unique,
  subtitle     text,
  description  text,
  thumbnail_url text,
  category     text        not null default 'General',
  level        text        not null default 'principiante'
               check (level in ('principiante', 'intermedio', 'avanzado')),
  instructor   text        not null default 'Profit Lab',
  -- Estado / lanzamiento
  status       text        not null default 'draft'
               check (status in ('draft', 'published', 'scheduled')),
  published_at timestamptz,           -- si status='scheduled', fecha de lanzamiento
  -- Acceso
  access_type  text        not null default 'free'
               check (access_type in ('free', 'enrollment')),
  -- 'free'       → cualquier alumno logueado puede auto-inscribirse
  -- 'enrollment' → solo un admin puede inscribir manualmente
  position     integer     not null default 0,   -- orden en el catálogo
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists courses_status_idx   on public.courses(status);
create index if not exists courses_position_idx on public.courses(position);

-- ============================================================
-- 3. MODULES  (secciones dentro de un curso)
-- ============================================================
create table if not exists public.modules (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  title      text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists modules_course_idx on public.modules(course_id, position);

-- ============================================================
-- 4. LESSONS  (clases en video de YouTube)
-- ============================================================
create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  title        text not null,
  description  text,
  youtube_id   text not null,                 -- ID de 11 chars del video de YouTube
  duration     text,                          -- ej. "12:34" (informativo)
  position     integer not null default 0,
  is_preview   boolean not null default false, -- clase de muestra gratuita
  -- Lanzamiento por goteo (drip content)
  release_type text not null default 'immediate'
               check (release_type in ('immediate', 'scheduled', 'drip_days')),
  release_at   timestamptz,   -- si release_type='scheduled'
  drip_days    integer,       -- si release_type='drip_days' (días tras inscribirse)
  resources    text,          -- enlaces / notas adicionales (markdown/plano)
  created_at   timestamptz not null default now()
);

create index if not exists lessons_module_idx on public.lessons(module_id, position);
create index if not exists lessons_course_idx on public.lessons(course_id);

-- ============================================================
-- 5. ENROLLMENTS  (inscripciones)
-- ============================================================
create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  status      text not null default 'active' check (status in ('active', 'completed')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create index if not exists enrollments_user_idx   on public.enrollments(user_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);

-- ============================================================
-- 6. LESSON_PROGRESS  (avance por clase)
-- ============================================================
create table if not exists public.lesson_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  completed    boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index if not exists progress_user_idx        on public.lesson_progress(user_id);
create index if not exists progress_user_course_idx on public.lesson_progress(user_id, course_id);

-- ============================================================
-- HELPERS
-- ============================================================

-- ¿El usuario actual es admin?  (SECURITY DEFINER evita recursión de RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ¿El usuario actual está inscrito en el curso?
create or replace function public.is_enrolled(course uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = auth.uid() and course_id = course
  );
$$;

-- Crear profile automáticamente al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantener updated_at al día
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists courses_touch on public.courses;
create trigger courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-inscripción segura (respeta el tipo de acceso del curso)
create or replace function public.enroll_me(course uuid)
returns public.enrollments
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.courses;
  e public.enrollments;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into c from public.courses where id = course;
  if not found then
    raise exception 'Curso no encontrado';
  end if;
  if c.status <> 'published' then
    raise exception 'El curso aún no está disponible';
  end if;
  if c.access_type <> 'free' then
    raise exception 'Este curso requiere inscripción por un administrador';
  end if;

  insert into public.enrollments (user_id, course_id)
  values (auth.uid(), course)
  on conflict (user_id, course_id) do update set status = public.enrollments.status
  returning * into e;

  return e;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;

-- ---------- PROFILES ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------- COURSES ----------
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses
  for select using (status = 'published' or public.is_admin());

drop policy if exists courses_admin_write on public.courses;
create policy courses_admin_write on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- MODULES ----------
drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules
  for select using (
    public.is_admin()
    or exists (select 1 from public.courses c
               where c.id = modules.course_id and c.status = 'published')
  );

drop policy if exists modules_admin_write on public.modules;
create policy modules_admin_write on public.modules
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- LESSONS ----------
-- Visible para admins; o si el curso está publicado y (es preview o el user está inscrito).
-- El "goteo" (drip) por fecha se aplica en la capa de aplicación.
drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons
  for select using (
    public.is_admin()
    or (
      exists (select 1 from public.courses c
              where c.id = lessons.course_id and c.status = 'published')
      and (lessons.is_preview or public.is_enrolled(lessons.course_id))
    )
  );

drop policy if exists lessons_admin_write on public.lessons;
create policy lessons_admin_write on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- ENROLLMENTS ----------
drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists enrollments_insert on public.enrollments;
create policy enrollments_insert on public.enrollments
  for insert with check (public.is_admin());  -- self-enroll usa enroll_me()

drop policy if exists enrollments_delete on public.enrollments;
create policy enrollments_delete on public.enrollments
  for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists enrollments_update on public.enrollments;
create policy enrollments_update on public.enrollments
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ---------- LESSON_PROGRESS ----------
drop policy if exists progress_select on public.lesson_progress;
create policy progress_select on public.lesson_progress
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists progress_insert on public.lesson_progress;
create policy progress_insert on public.lesson_progress
  for insert with check (user_id = auth.uid());

drop policy if exists progress_update on public.lesson_progress;
create policy progress_update on public.lesson_progress
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists progress_delete on public.lesson_progress;
create policy progress_delete on public.lesson_progress
  for delete using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- CÓMO CREAR TU PRIMER ADMIN (Master Study)
-- ------------------------------------------------------------
-- 1. Regístrate normalmente desde la app (/signup).
-- 2. Vuelve aquí y ejecuta, con TU email:
--
--    update public.profiles set role = 'admin'
--    where email = 'tu-correo@ejemplo.com';
--
-- 3. Recarga la app: ya verás el panel de administración.
-- ============================================================
