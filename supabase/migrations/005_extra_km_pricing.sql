-- ============================================
-- KNÖLLCHEN-PILOT — Migration 005
-- Mehrkilometer: Preis pro km auf Fahrzeug-Ebene,
-- Freikilometer und berechnete Mehrkosten auf Vertrags-Ebene.
-- ============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS extra_km_price DECIMAL(10,2) DEFAULT 0.29;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS km_limit INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extra_km_cost DECIMAL(10,2);
