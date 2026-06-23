-- ============================================
-- KNÖLLCHEN-PILOT — Migration 059
-- KI-Schadenvergleich (Übergabe vs. Rücknahme) persistent machen.
-- Die Compare-Route (Claude Vision) vergleicht pro Position das Vorher-/
-- Nachher-Foto. Das Ergebnis wurde bisher nur live im Dashboard angezeigt
-- und ging beim Neuladen verloren. Hier persistieren wir die komplette
-- Positions-Map plus eine aggregierte Zusammenfassung am Vertrag, damit das
-- Verdikt zuverlässig sichtbar bleibt (und keine Tokens doppelt verbrannt
-- werden).
-- ============================================

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS damage_comparison      JSONB,        -- Positions-Map: position -> { ok, data|error }
  ADD COLUMN IF NOT EXISTS damage_comparison_at   TIMESTAMPTZ,  -- Zeitpunkt der letzten Auswertung
  ADD COLUMN IF NOT EXISTS has_new_damage         BOOLEAN,      -- true, wenn mind. eine Position has_damage
  ADD COLUMN IF NOT EXISTS damage_max_severity    TEXT;         -- 'none' | 'minor' | 'major' | null (höchste Stufe)
