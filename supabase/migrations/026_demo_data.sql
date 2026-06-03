-- ============================================
-- KNÖLLCHEN-PILOT — Migration 026
-- Beispieldaten-Markierung pro Organisation.
-- demo_seeded: wurde die Org bereits mit Beispieldaten befüllt (idempotent)?
-- demo_data:   IDs der erzeugten Demo-Zeilen je Tabelle, damit sie mit einem
--              Klick rückstandsfrei (und ohne echte Daten zu treffen) gelöscht
--              werden können.
-- ============================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS demo_seeded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS demo_data JSONB;
