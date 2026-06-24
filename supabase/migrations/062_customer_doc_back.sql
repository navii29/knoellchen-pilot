-- ============================================
-- KNÖLLCHEN-PILOT — Migration 062
-- Vorder- UND Rückseite je Kundendokument. Bisher hält jeder Kunde nur EIN Foto
-- pro Dokument (license_photo_path, id_card_photo_path). Deutsche Dokumente
-- brauchen aber beide Seiten: beim Personalausweis stehen Adresse + Nummer auf
-- der RÜCKSEITE, beim Führerschein die Klassen + Gültigkeit ebenfalls hinten.
-- Hier ergänzen wir je Dokument einen zweiten Pfad für die Rückseite; die
-- Vorderseite nutzt weiterhin das bestehende *_photo_path-Feld.
-- Keine RLS-Änderung nötig (customers ist bereits RLS-geschützt).
-- ============================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS license_photo_back_path  TEXT,  -- Führerschein Rückseite (Klassen/Gültigkeit)
  ADD COLUMN IF NOT EXISTS id_card_photo_back_path  TEXT;  -- Personalausweis Rückseite (Adresse/Nummer)
