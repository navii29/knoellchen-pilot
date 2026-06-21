-- ============================================
-- KNÖLLCHEN-PILOT — Migration 045
-- Auto-Aussteuerung (first_registration + 180 Tage) pro Fahrzeug abschaltbar.
-- Use-Case: gekaufte Sportwagen / Langläufer / Auto-Abos laufen deutlich länger
-- als 180 Tage. Dann soll NUR ein manuell gesetztes Aussteuerungsdatum gelten.
-- ============================================

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS disable_auto_decommission BOOLEAN NOT NULL DEFAULT false;

-- Trigger-Funktion (Migration 027) erweitern: Auto-Berechnung überspringen,
-- wenn disable_auto_decommission = true. Ein manuell gesetztes decommission_date
-- behält weiterhin Vorrang.
CREATE OR REPLACE FUNCTION vehicles_default_decommission_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT COALESCE(NEW.disable_auto_decommission, false) THEN
    IF NEW.decommission_date IS NULL AND NEW.first_registration IS NOT NULL THEN
      NEW.decommission_date := NEW.first_registration + 180;
    ELSIF TG_OP = 'UPDATE'
      AND NEW.decommission_date IS NOT DISTINCT FROM OLD.decommission_date
      AND NEW.first_registration IS DISTINCT FROM OLD.first_registration THEN
      NEW.decommission_date := CASE
        WHEN NEW.first_registration IS NULL THEN NULL
        ELSE NEW.first_registration + 180
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
