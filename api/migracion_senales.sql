-- ============================================================
-- PROFIT LAB · AULA VIRTUAL — Migración: SEÑALES / PROYECCIONES
-- ------------------------------------------------------------
-- Trae el sistema de señales de trading (ex profitlab-web / Supabase)
-- al aula: señales + proyecciones, con línea de tiempo de actualizaciones,
-- acceso por CUPÓN o COMPRA (igual que Mercados) y suscripciones push
-- (para notificaciones nativas más adelante).
-- Importar en: Site Tools → phpMyAdmin → (tu base) → SQL → pegar y ejecutar.
-- Es seguro re-ejecutar: usa IF NOT EXISTS.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- SEÑALES DE TRADING
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signals (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id       CHAR(36)        NOT NULL,                 -- quién la publicó (users.id)
  trader_id       CHAR(36)        NULL,                     -- mentor/trader asignado
  asset           VARCHAR(40)     NOT NULL,                 -- p.ej. BTCUSDT, EURUSD, US100
  direction       ENUM('long','short') NOT NULL,
  entry_price     DECIMAL(20,8)   NOT NULL,
  stop_loss       DECIMAL(20,8)   NOT NULL,
  take_profit_1   DECIMAL(20,8)   NOT NULL,
  take_profit_2   DECIMAL(20,8)   NULL,
  take_profit_3   DECIMAL(20,8)   NULL,
  take_profit_4   DECIMAL(20,8)   NULL,
  be_price        DECIMAL(20,8)   NULL,                     -- precio tras mover a break-even
  tradingview_url VARCHAR(500)    NULL,
  image_url       VARCHAR(500)    NULL,                     -- captura del gráfico (via /upload)
  notes           TEXT            NULL,
  recommendations TEXT            NULL,
  audience        ENUM('free','premium','all') NOT NULL DEFAULT 'all',
  status          ENUM('active','be','tp1_hit','tp2_hit','tp3_hit','tp4_hit','sl_hit','closed')
                                  NOT NULL DEFAULT 'active',
  result_r        DECIMAL(10,2)   NULL,                     -- R resultante (si cerrada)
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_signals_status (status),
  KEY idx_signals_trader (trader_id),
  KEY idx_signals_created (created_at),
  CONSTRAINT fk_signals_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_signals_trader FOREIGN KEY (trader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Línea de tiempo de la señal (publicación, BE, parciales, cierre, notas…).
CREATE TABLE IF NOT EXISTS signal_updates (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  signal_id  BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(24)     NOT NULL,   -- published|edited|be_moved|tp1_hit|tp2_hit|tp3_hit|tp4_hit|sl_hit|closed_manual|closed|note_added
  message    TEXT            NULL,
  payload    JSON            NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_supd_signal (signal_id),
  KEY idx_supd_type (type),
  CONSTRAINT fk_supd_signal FOREIGN KEY (signal_id) REFERENCES signals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- PROYECCIONES (ideas de mercado)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projections (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id       CHAR(36)        NOT NULL,
  trader_id       CHAR(36)        NULL,
  title           VARCHAR(160)    NOT NULL,
  direction       ENUM('alcista','bajista') NOT NULL,
  probability     ENUM('alta','media','baja') NOT NULL,
  description     TEXT            NULL,
  image_url       VARCHAR(500)    NULL,
  tradingview_url VARCHAR(500)    NULL,
  audience        ENUM('free','premium','all') NOT NULL DEFAULT 'all',
  status          ENUM('active','archived') NOT NULL DEFAULT 'active',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_proj_status (status),
  KEY idx_proj_trader (trader_id),
  KEY idx_proj_created (created_at),
  CONSTRAINT fk_proj_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_proj_trader FOREIGN KEY (trader_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projection_updates (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  projection_id BIGINT UNSIGNED NOT NULL,
  type          VARCHAR(24)     NOT NULL,   -- published|edited|note_added|archived
  message       TEXT            NULL,
  payload       JSON            NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_pupd_proj (projection_id),
  CONSTRAINT fk_pupd_proj FOREIGN KEY (projection_id) REFERENCES projections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- ACCESO A SEÑALES (cupón o compra) — mismo patrón que Mercados/quant
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS signals_access (
  user_id      CHAR(36)    NOT NULL,
  lifetime     TINYINT(1)  NOT NULL DEFAULT 0,
  access_until DATETIME    NULL,
  source       VARCHAR(40) NULL,                     -- 'coupon' | 'mercadopago' | 'admin'
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_signals_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS signals_coupons (
  id         CHAR(36)     NOT NULL,
  code       VARCHAR(40)  NOT NULL,
  days       INT          NOT NULL DEFAULT 30,   -- 0 = acceso vitalicio
  max_uses   INT          NOT NULL DEFAULT 0,    -- 0 = usos ilimitados
  uses       INT          NOT NULL DEFAULT 0,
  active     TINYINT(1)   NOT NULL DEFAULT 1,
  expires_at DATETIME     NULL,
  note       VARCHAR(160) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_signals_coupon_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS signals_coupon_uses (
  id         CHAR(36)  NOT NULL,
  coupon_id  CHAR(36)  NOT NULL,
  user_id    CHAR(36)  NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_signals_use (coupon_id, user_id),
  KEY idx_signals_use_user (user_id),
  CONSTRAINT fk_signals_use_coupon FOREIGN KEY (coupon_id) REFERENCES signals_coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_signals_use_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- SUSCRIPCIONES PUSH (para notificaciones nativas, fase siguiente)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NOT NULL,
  endpoint   VARCHAR(500) NOT NULL,     -- web push endpoint o token nativo
  p256dh     VARCHAR(255) NULL,
  auth       VARCHAR(255) NULL,
  platform   VARCHAR(20)  NULL,         -- 'web' | 'android' | 'ios'
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_push_endpoint (endpoint),
  KEY idx_push_user (user_id),
  CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- CONTEO · SESIONES OPERATIVAS (registro diario de RR)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operating_sessions (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  author_id    CHAR(36)        NOT NULL,
  session_date DATE            NOT NULL,
  session_type ENUM('ny','asia','backtesting','otra') NOT NULL DEFAULT 'ny',
  result_rr    DECIMAL(10,2)   NOT NULL DEFAULT 0,     -- R:R del día (puede ser negativo)
  trades_count INT             NOT NULL DEFAULT 0,
  note         TEXT            NULL,
  audience     ENUM('free','premium','all') NOT NULL DEFAULT 'all',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sessions_date (session_date),
  CONSTRAINT fk_sessions_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
