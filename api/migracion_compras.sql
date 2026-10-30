-- ============================================================
-- MIGRACIÓN · añade precio a cursos + tabla de compras
-- Ejecuta esto en phpMyAdmin SI YA importaste schema.sql antes
-- (para bases de datos existentes). Es seguro correrlo una vez.
-- ============================================================

ALTER TABLE courses
  ADD COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER access_type,
  ADD COLUMN currency VARCHAR(8) NOT NULL DEFAULT 'USD' AFTER price;

CREATE TABLE IF NOT EXISTS purchases (
  id           CHAR(36)      NOT NULL,
  user_id      CHAR(36)      NOT NULL,
  course_id    CHAR(36)      NULL,
  course_title VARCHAR(200)  NOT NULL,
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency     VARCHAR(8)    NOT NULL DEFAULT 'USD',
  status       ENUM('completed','refunded') NOT NULL DEFAULT 'completed',
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_purchases_user (user_id, created_at),
  CONSTRAINT fk_purchases_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchases_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
