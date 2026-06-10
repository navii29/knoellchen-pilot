-- ============================================
-- KNÖLLCHEN-PILOT — Migration 027
-- Ausflottung manuell setzbar: decommission_date war bisher eine generierte
-- Spalte (first_registration + 180, Migration 004) und damit nicht beschreibbar.
-- Jetzt: normale Spalte + Trigger, der das Auto-Verhalten beibehaelt, solange
-- kein manuelles Datum gesetzt wird ("Ausgeflottet zum" im Fahrzeugformular).
-- ============================================

-- Generierte Spalte in normale Spalte umwandeln (gespeicherte Werte bleiben erhalten)
ALTER TABLE vehicles ALTER COLUMN decommission_date DROP EXPRESSION IF EXISTS;

-- Auto-Berechnung als Trigger:
--  - Wenn kein Datum gesetzt ist, aber eine Erstzulassung existiert -> EZ + 180 Tage.
--  - Wenn sich die Erstzulassung aendert und das Datum NICHT manuell mitgeaendert
--    wurde -> neu berechnen (bisheriges Verhalten der generierten Spalte).
--  - Ein manuell gesetztes Datum (z. B. "Ausgeflottet zum") hat immer Vorrang.
CREATE OR REPLACE FUNCTION vehicles_default_decommission_date()
RETURNS TRIGGER AS $$
BEGIN
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
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicles_decommission_default ON vehicles;
CREATE TRIGGER trg_vehicles_decommission_default
  BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION vehicles_default_decommission_date();
