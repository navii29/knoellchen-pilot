-- ============================================
-- KNÖLLCHEN-PILOT — Migration 022
-- Margenrechnung pro Fahrzeug: monatliche Kosten (Leasing/Versicherung
-- /Wartung), umgerechneter Tagesatz, und Soll-Tagespreis (VK).
-- ============================================

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS cost_daily        DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS cost_monthly      DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS target_daily_rate DECIMAL(10, 2);
