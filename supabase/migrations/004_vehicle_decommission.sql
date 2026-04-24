-- ============================================
-- KNÖLLCHEN-PILOT — Migration 004
-- Aussteuerungs-Tracking für Fahrzeuge.
-- decommission_date wird automatisch berechnet (first_registration + 180 Tage).
-- ============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS first_registration DATE;

-- decommission_date = first_registration + 180 Tage (generierte Spalte, immer synchron)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS decommission_date DATE
  GENERATED ALWAYS AS (first_registration + 180) STORED;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS decommission_reminded BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vehicles_decommission ON vehicles(org_id, decommission_date);
