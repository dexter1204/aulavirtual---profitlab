-- ============================================================
-- MIGRACIÓN · Mercado Pago (columnas de proveedor/referencia en compras)
-- Ejecuta en phpMyAdmin (base dbdqsfhttnmtsx) si ya tienes la BD.
-- ============================================================

ALTER TABLE purchases
  MODIFY COLUMN status ENUM('completed','refunded','pending') NOT NULL DEFAULT 'completed',
  ADD COLUMN provider  VARCHAR(40)  NOT NULL DEFAULT 'manual' AFTER status,
  ADD COLUMN reference VARCHAR(120) NULL AFTER provider,
  ADD UNIQUE KEY uq_purchases_ref (reference);
