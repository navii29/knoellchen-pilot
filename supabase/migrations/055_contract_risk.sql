-- ============================================
-- KNÖLLCHEN-PILOT — Migration 055
-- KI-Risikocheck im Self-Check-in. Bewertet anhand von Buchungshistorie,
-- Vertragsverhalten und optionaler Selbstauskunft das Risiko eines Mieters
-- (gruen / gelb / rot). Keine externe Auskunftei — rein internes Scoring.
-- Der Betreiber kann ein rotes Ergebnis manuell freigeben (Override).
-- ============================================

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS risk_consent       BOOLEAN      DEFAULT false,
  ADD COLUMN IF NOT EXISTS risk_level         TEXT,
  ADD COLUMN IF NOT EXISTS risk_score         INTEGER,
  ADD COLUMN IF NOT EXISTS risk_summary       TEXT,
  ADD COLUMN IF NOT EXISTS risk_factors       JSONB,
  ADD COLUMN IF NOT EXISTS risk_checked_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_override_by   UUID         REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS risk_override_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS risk_override_reason TEXT;
