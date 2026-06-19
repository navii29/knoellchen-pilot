-- ============================================
-- KNÖLLCHEN-PILOT — Migration 041
-- Wiederverwendbare Vermieter-Unterschrift (Chef unterschreibt einmal,
-- erscheint automatisch auf jedem Mietvertrag: Seite 1 rechts, Seite 3
-- rechts, Seite 6 Mitte "Bevollmächtigter").
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS landlord_signature_data TEXT,
  ADD COLUMN IF NOT EXISTS landlord_signature_name TEXT;
