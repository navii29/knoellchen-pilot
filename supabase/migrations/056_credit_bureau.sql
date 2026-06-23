-- ============================================
-- KNÖLLCHEN-PILOT — Migration 056
-- Externe Bonitätsauskunft (provider-agnostisch). Der Betreiber hinterlegt in
-- den Einstellungen einen Anbieter + Zugangsdaten; mit Einwilligung des Kunden
-- kann eine Auskunft eingeholt werden. Das Ergebnis (Score / Rating / Ampel-
-- Entscheidung gruen|gelb|rot) wird am Kunden gespeichert und angezeigt.
--
-- Sicherheit: credit_api_key liegt — wie lexoffice_api_key / echoes_api_key —
-- ausschließlich serverseitig und darf NIE an den Browser gelangen.
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS credit_provider TEXT,
  ADD COLUMN IF NOT EXISTS credit_api_url  TEXT,
  ADD COLUMN IF NOT EXISTS credit_api_key  TEXT;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS credit_score      INTEGER,
  ADD COLUMN IF NOT EXISTS credit_rating     TEXT,
  ADD COLUMN IF NOT EXISTS credit_decision   TEXT, -- 'gruen' | 'gelb' | 'rot' | null
  ADD COLUMN IF NOT EXISTS credit_provider   TEXT,
  ADD COLUMN IF NOT EXISTS credit_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS credit_consent    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_raw        JSONB;
