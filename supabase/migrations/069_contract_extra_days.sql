-- ============================================
-- KNÖLLCHEN-PILOT — Migration 069
-- Abrechnung der Tage ÜBER das ursprüngliche Rückgabedatum hinaus
-- (Verlängerungs- + Überzieh-Tage) bei der Rückgabe.
--   - original_return_date: bei Anlage = return_date, danach FIX (die
--     Genehmigung überschreibt nur return_date, nie dieses Feld). Basis für
--     extra_days = max(0, actual_return_date - original_return_date).
--   - extra_days_cost: bei Rückgabe berechnet (extra_days × effektiver
--     Tagespreis), analog zu extra_km_cost.
-- Beide nullable; NULL → Zusatztage 0 (kein Absturz). Keine RLS-Änderung.
-- ============================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS original_return_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extra_days_cost DECIMAL(10,2);
