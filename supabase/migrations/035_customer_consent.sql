-- ============================================
-- KNÖLLCHEN-PILOT — Migration 035
-- Einwilligung (Marketing/Werbung) mit Zeitstempel + Quelle, DSGVO-konform
-- vom Kunden im Portal selbst setz- und widerrufbar.
-- ============================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_source TEXT;
