-- ============================================================
-- PROFIT LAB · AULA VIRTUAL — Esquema MySQL (SiteGround)
-- ------------------------------------------------------------
-- Importar en:  Site Tools → Bases de datos MySQL → phpMyAdmin → Importar
-- (o pestaña SQL y pegar todo). Compatible con MySQL 5.7+ / MariaDB 10.2+.
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ------------------------------------------------------------
-- USERS (usuarios de la academia + credenciales)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     NOT NULL,
  name          VARCHAR(160) NOT NULL DEFAULT 'Estudiante',
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','student') NOT NULL DEFAULT 'student',
  avatar_url    VARCHAR(512) NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- COURSES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id            CHAR(36)     NOT NULL,
  title         VARCHAR(200) NOT NULL,
  slug          VARCHAR(80)  NOT NULL,
  subtitle      VARCHAR(255) NULL,
  description   TEXT         NULL,
  thumbnail_url VARCHAR(512) NULL,
  category      VARCHAR(80)  NOT NULL DEFAULT 'General',
  level         ENUM('principiante','intermedio','avanzado') NOT NULL DEFAULT 'principiante',
  instructor    VARCHAR(160) NOT NULL DEFAULT 'Profit Lab',
  status        ENUM('draft','published','scheduled') NOT NULL DEFAULT 'draft',
  published_at  DATETIME     NULL,
  access_type   ENUM('free','enrollment') NOT NULL DEFAULT 'free',
  price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency      VARCHAR(8)   NOT NULL DEFAULT 'USD',
  position      INT          NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_courses_slug (slug),
  KEY idx_courses_status (status),
  KEY idx_courses_position (position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- MODULES (secciones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modules (
  id         CHAR(36)     NOT NULL,
  course_id  CHAR(36)     NOT NULL,
  title      VARCHAR(200) NOT NULL,
  position   INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_modules_course (course_id, position),
  CONSTRAINT fk_modules_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- LESSONS (clases en video de YouTube)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id           CHAR(36)     NOT NULL,
  module_id    CHAR(36)     NOT NULL,
  course_id    CHAR(36)     NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT         NULL,
  youtube_id   VARCHAR(20)  NOT NULL,
  duration     VARCHAR(20)  NULL,
  position     INT          NOT NULL DEFAULT 0,
  is_preview   TINYINT(1)   NOT NULL DEFAULT 0,
  release_type ENUM('immediate','scheduled','drip_days') NOT NULL DEFAULT 'immediate',
  release_at   DATETIME     NULL,
  drip_days    INT          NULL,
  resources    TEXT         NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_lessons_module (module_id, position),
  KEY idx_lessons_course (course_id),
  CONSTRAINT fk_lessons_module FOREIGN KEY (module_id)
    REFERENCES modules(id) ON DELETE CASCADE,
  CONSTRAINT fk_lessons_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- ENROLLMENTS (inscripciones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id           CHAR(36)  NOT NULL,
  user_id      CHAR(36)  NOT NULL,
  course_id    CHAR(36)  NOT NULL,
  status       ENUM('active','completed') NOT NULL DEFAULT 'active',
  enrolled_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME  NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enroll_user_course (user_id, course_id),
  KEY idx_enroll_user (user_id),
  KEY idx_enroll_course (course_id),
  CONSTRAINT fk_enroll_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_enroll_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- MATERIALS (documentos, archivos y enlaces por clase)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  id         CHAR(36)     NOT NULL,
  lesson_id  CHAR(36)     NOT NULL,
  course_id  CHAR(36)     NOT NULL,
  kind       ENUM('file','link') NOT NULL DEFAULT 'file',
  title      VARCHAR(200) NOT NULL,
  url        VARCHAR(1024) NOT NULL,
  mime       VARCHAR(160) NULL,
  size       BIGINT       NULL,
  position   INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_materials_lesson (lesson_id, position),
  CONSTRAINT fk_materials_lesson FOREIGN KEY (lesson_id)
    REFERENCES lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_materials_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- LESSON_PROGRESS (avance por clase)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id           CHAR(36)  NOT NULL,
  user_id      CHAR(36)  NOT NULL,
  lesson_id    CHAR(36)  NOT NULL,
  course_id    CHAR(36)  NOT NULL,
  completed    TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME  NULL,
  updated_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_progress_user_lesson (user_id, lesson_id),
  KEY idx_progress_user_course (user_id, course_id),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id)
    REFERENCES lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_progress_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- PURCHASES (perfil de compras / historial de adquisiciones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchases (
  id           CHAR(36)      NOT NULL,
  user_id      CHAR(36)      NOT NULL,
  course_id    CHAR(36)      NULL,
  course_title VARCHAR(200)  NOT NULL,
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency     VARCHAR(8)    NOT NULL DEFAULT 'USD',
  status       ENUM('completed','refunded','pending') NOT NULL DEFAULT 'completed',
  provider     VARCHAR(40)   NOT NULL DEFAULT 'manual',
  reference    VARCHAR(120)  NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_purchases_ref (reference),
  KEY idx_purchases_user (user_id, created_at),
  CONSTRAINT fk_purchases_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchases_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CÓMO CREAR TU PRIMER ADMIN (Master Study)
-- ------------------------------------------------------------
-- 1. Regístrate normalmente desde la app (/signup).
-- 2. Ejecuta esto en phpMyAdmin con TU email:
--
--    UPDATE users SET role = 'admin' WHERE email = 'tu-correo@ejemplo.com';
--
-- 3. Vuelve a iniciar sesión: verás el panel Master Study.
-- ============================================================
