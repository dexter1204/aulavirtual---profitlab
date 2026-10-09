-- ============================================================
-- PROFIT LAB · AULA VIRTUAL — Migración: ACCESO QUANT (Mercados)
-- ------------------------------------------------------------
-- Controla el acceso al dashboard de exposiciones (gamma/beta).
-- El acceso se obtiene por CUPÓN o por COMPRA (Mercado Pago). Sin
-- acceso activo, la sección "Mercados" exige canjear un cupón o comprar.
-- Importar en: Site Tools → phpMyAdmin → (tu base) → SQL → pegar y ejecutar.
-- Es seguro re-ejecutar: usa IF NOT EXISTS.
-- ============================================================

-- Entitlement de acceso al quant por usuario.
CREATE TABLE IF NOT EXISTS quant_access (
  user_id      CHAR(36)    NOT NULL,
  lifetime     TINYINT(1)  NOT NULL DEFAULT 0,       -- 1 = acceso vitalicio
  access_until DATETIME    NULL,                     -- fecha de expiración (si no es vitalicio)
  source       VARCHAR(40) NULL,                     -- 'coupon' | 'mercadopago' | 'admin'
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_quant_access_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cupones que otorgan acceso al quant.
CREATE TABLE IF NOT EXISTS quant_coupons (
  id         CHAR(36)     NOT NULL,
  code       VARCHAR(40)  NOT NULL,
  days       INT          NOT NULL DEFAULT 30,   -- 0 = acceso vitalicio
  max_uses   INT          NOT NULL DEFAULT 0,    -- 0 = usos ilimitados
  uses       INT          NOT NULL DEFAULT 0,
  active      TINYINT(1)  NOT NULL DEFAULT 1,
  expires_at DATETIME     NULL,                  -- caducidad del cupón (no del acceso)
  note       VARCHAR(160) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quant_coupon_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Registro de canjes (auditoría + evita doble canje por el mismo usuario).
CREATE TABLE IF NOT EXISTS quant_coupon_uses (
  id         CHAR(36)  NOT NULL,
  coupon_id  CHAR(36)  NOT NULL,
  user_id    CHAR(36)  NOT NULL,
  created_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quant_use (coupon_id, user_id),
  KEY idx_quant_use_user (user_id),
  CONSTRAINT fk_quant_use_coupon FOREIGN KEY (coupon_id)
    REFERENCES quant_coupons(id) ON DELETE CASCADE,
  CONSTRAINT fk_quant_use_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
