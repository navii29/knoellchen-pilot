-- ============================================
-- KNÖLLCHEN-PILOT — Migration 019
-- Self-Check-in / Self-Check-out für das Kundenportal:
-- Fortschritts-Tracking und Tankstand bei Übergabe + Rückgabe.
-- ============================================

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS checkin_step      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_step     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fuel_level_pickup TEXT,
  ADD COLUMN IF NOT EXISTS fuel_level_return TEXT;

-- Erlaubte Werte (Soft-Constraint via CHECK):
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_fuel_level_pickup_chk,
  ADD CONSTRAINT contracts_fuel_level_pickup_chk
    CHECK (fuel_level_pickup IS NULL OR fuel_level_pickup IN ('full','three_quarter','half','quarter','empty'));

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_fuel_level_return_chk,
  ADD CONSTRAINT contracts_fuel_level_return_chk
    CHECK (fuel_level_return IS NULL OR fuel_level_return IN ('full','three_quarter','half','quarter','empty'));
