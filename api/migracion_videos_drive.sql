-- ============================================================
-- PROFIT LAB · AULA VIRTUAL — Migración: videos de Google Drive
-- ------------------------------------------------------------
-- Permite que una clase use video de YouTube o de Google Drive.
-- Importar en: Site Tools → phpMyAdmin → (tu base) → SQL → pegar y ejecutar.
-- Es idempotente en la práctica: si ya la corriste, dará error de
-- "columna duplicada" y puedes ignorarlo.
-- ============================================================

-- 1) Ensancha la columna del ID de video (los IDs de Drive son más largos).
ALTER TABLE lessons
  MODIFY youtube_id VARCHAR(128) NOT NULL;

-- 2) Añade el proveedor del video (youtube | drive).
ALTER TABLE lessons
  ADD COLUMN video_provider VARCHAR(16) NOT NULL DEFAULT 'youtube' AFTER youtube_id;
