-- ============================================================
-- MIGRACIÓN · materiales de clase (documentos, archivos, enlaces)
-- Ejecuta en phpMyAdmin (base dbdqsfhttnmtsx) si ya tienes la BD.
-- Seguro de ejecutar una sola vez.
-- ============================================================

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
