-- ============================================
-- KNÖLLCHEN-PILOT — Migration 011
-- Rückgabe-Tracking mit taggenauer Kilometerberechnung.
-- Inklusivkilometer pro Monat (vom Fahrzeug) werden anteilig auf
-- die tatsächlichen Miettage hochgerechnet (1 Monat = 30 Tage).
-- ============================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS actual_days        INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS actual_km_allowed  INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS km_driven          INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS km_excess          INTEGER;
-- extra_km_cost existiert bereits aus Migration 005

CREATE INDEX IF NOT EXISTS idx_contracts_returned ON contracts(org_id, actual_return_date);
