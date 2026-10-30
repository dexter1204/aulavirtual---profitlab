-- ============================================================
-- PROFIT LAB · AULA VIRTUAL — Migración: TAREAS (assignments)
-- ------------------------------------------------------------
-- El admin crea tareas por curso; los alumnos inscritos entregan
-- subiendo archivos (PDF, documentos, etc.) y un comentario.
-- Importar en: Site Tools → phpMyAdmin → (tu base) → SQL → pegar y ejecutar.
-- Es seguro re-ejecutar: usa IF NOT EXISTS.
-- ============================================================

-- Tareas creadas por el admin (una por curso).
CREATE TABLE IF NOT EXISTS assignments (
  id          CHAR(36)     NOT NULL,
  course_id   CHAR(36)     NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT         NULL,
  due_date    DATETIME     NULL,
  position    INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_assignments_course (course_id, position),
  CONSTRAINT fk_assignments_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Entrega de un alumno para una tarea (una por alumno; se actualiza).
CREATE TABLE IF NOT EXISTS submissions (
  id            CHAR(36)     NOT NULL,
  assignment_id CHAR(36)     NOT NULL,
  user_id       CHAR(36)     NOT NULL,
  comment       TEXT         NULL,
  status        ENUM('entregada','revisada') NOT NULL DEFAULT 'entregada',
  grade         VARCHAR(40)  NULL,
  feedback      TEXT         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_submission (assignment_id, user_id),
  KEY idx_submissions_user (user_id),
  CONSTRAINT fk_submissions_assignment FOREIGN KEY (assignment_id)
    REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_submissions_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Archivos subidos por el alumno dentro de su entrega.
CREATE TABLE IF NOT EXISTS submission_files (
  id            CHAR(36)     NOT NULL,
  submission_id CHAR(36)     NOT NULL,
  title         VARCHAR(255) NOT NULL,
  url           VARCHAR(1024) NOT NULL,
  mime          VARCHAR(160) NULL,
  size          BIGINT       NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_submission_files (submission_id),
  CONSTRAINT fk_submission_files FOREIGN KEY (submission_id)
    REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
