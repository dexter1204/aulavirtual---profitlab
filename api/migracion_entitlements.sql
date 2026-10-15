-- ============================================================
-- PROFIT LAB · AULA VIRTUAL — Migración: ACCESOS UNIFICADOS (super-app)
-- ------------------------------------------------------------
-- Unifica el acceso premium de los productos (quant, signals, news…)
-- en un solo modelo + cupones multi-scope (el "cupón general").
-- No reemplaza quant_access / signals_access: convive con ellas y las
-- "espeja" desde la lógica PHP, así nada existente se rompe.
-- Importar en: Site Tools → phpMyAdmin → (tu base) → SQL → pegar y ejecutar.
-- Seguro de re-ejecutar: usa IF NOT EXISTS + ON DUPLICATE KEY.
-- Requiere que ya exista: users.
-- ============================================================

-- ------------------------------------------------------------
-- PREREQUISITO · tablas legacy con el esquema canónico.
-- El backfill y el "espejo" PHP leen/escriben lifetime, access_until,
-- source y updated_at en quant_access / signals_access. Estas CREATE las
-- dejan listas en instalaciones nuevas (no-op si ya existen).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quant_access (
  user_id      CHAR(36)    NOT NULL,
  lifetime     TINYINT(1)  NOT NULL DEFAULT 0,
  access_until DATETIME    NULL,
  source       VARCHAR(40) NULL,
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_quant_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS signals_access (
  user_id      CHAR(36)    NOT NULL,
  lifetime     TINYINT(1)  NOT NULL DEFAULT 0,
  access_until DATETIME    NULL,
  source       VARCHAR(40) NULL,
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_signals_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OJO · instalación ANTIGUA: si quant_access (o signals_access) ya existía
-- SIN la columna 'lifetime', el CREATE de arriba NO la añade (IF NOT EXISTS).
-- En ese caso ejecuta UNA vez (conserva las filas; quedan con lifetime=0):
--   ALTER TABLE quant_access   ADD COLUMN lifetime TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id;
--   ALTER TABLE signals_access ADD COLUMN lifetime TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id;
-- (Producción se alineó así el 2026-10-13: 21 accesos de quant migrados.)

-- Entitlement por usuario y producto.
--   product: 'quant' | 'signals' | 'news' | 'courses'
CREATE TABLE IF NOT EXISTS entitlements (
  user_id      CHAR(36)    NOT NULL,
  product      VARCHAR(20) NOT NULL,
  lifetime     TINYINT(1)  NOT NULL DEFAULT 0,       -- 1 = acceso vitalicio
  access_until DATETIME    NULL,                     -- expiración (si no es vitalicio)
  source       VARCHAR(40) NULL,                     -- 'coupon' | 'mercadopago' | 'admin' | 'migration'
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product),
  KEY idx_ent_product (product),
  CONSTRAINT fk_ent_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cupones unificados (multi-scope). scopes = lista separada por comas,
-- p.ej. 'quant,signals,news' = cupón GENERAL de los 3 premium.
CREATE TABLE IF NOT EXISTS access_coupons (
  id         CHAR(36)     NOT NULL,
  code       VARCHAR(40)  NOT NULL,
  scopes     VARCHAR(120) NOT NULL DEFAULT 'quant,signals,news',
  days       INT          NOT NULL DEFAULT 30,   -- 0 = acceso vitalicio
  max_uses   INT          NOT NULL DEFAULT 0,    -- 0 = usos ilimitados
  uses       INT          NOT NULL DEFAULT 0,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  expires_at DATETIME     NULL,                  -- caducidad del cupón (no del acceso)
  note       VARCHAR(160) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_access_coupon_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro de canjes (auditoría + evita doble canje por usuario).
CREATE TABLE IF NOT EXISTS access_coupon_uses (
  id         CHAR(36)  NOT NULL,
  coupon_id  CHAR(36)  NOT NULL,
  user_id    CHAR(36)  NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_access_use (coupon_id, user_id),
  KEY idx_access_use_user (user_id),
  CONSTRAINT fk_access_use_coupon FOREIGN KEY (coupon_id)
    REFERENCES access_coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_access_use_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Backfill: traer los accesos actuales a la tabla unificada, para que
-- /access/me refleje lo que el alumno ya tiene desde el primer día.
-- (Si quant_access / signals_access aún no existen, omite estas 2 líneas.)
-- ------------------------------------------------------------
INSERT INTO entitlements (user_id, product, lifetime, access_until, source)
  SELECT user_id, 'quant', lifetime, access_until, 'migration' FROM quant_access
ON DUPLICATE KEY UPDATE
  lifetime = VALUES(lifetime), access_until = VALUES(access_until);

INSERT INTO entitlements (user_id, product, lifetime, access_until, source)
  SELECT user_id, 'signals', lifetime, access_until, 'migration' FROM signals_access
ON DUPLICATE KEY UPDATE
  lifetime = VALUES(lifetime), access_until = VALUES(access_until);

-- ------------------------------------------------------------
-- (Opcional) Crea un cupón general de ejemplo. Descomenta para usarlo.
-- INSERT INTO access_coupons (id, code, scopes, days, max_uses, note)
--   VALUES (UUID(), 'PLQ-ALL-2026', 'quant,signals,news', 30, 0, 'Cupón general demo');
