-- ============================================
-- KNÖLLCHEN-PILOT — Migration 047
-- Bugfix Trigger vehicles_default_decommission_date():
-- Bisher wurde ein MANUELL gesetztes decommission_date überschrieben, sobald
-- man die Erstzulassung änderte (die ELSIF-Bedingung konnte Auto- nicht von
-- Hand-Werten unterscheiden). Jetzt wird nur neu berechnet, wenn das bisherige
-- Datum tatsächlich der Auto-Wert (OLD.first_registration + 180) war.
-- ============================================

CREATE OR REPLACE FUNCTION vehicles_default_decommission_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT COALESCE(NEW.disable_auto_decommission, false) THEN
    IF NEW.decommission_date IS NULL AND NEW.first_registration IS NOT NULL THEN
      -- Kein Datum gesetzt → Auto-Wert.
      NEW.decommission_date := NEW.first_registration + 180;
    ELSIF TG_OP = 'UPDATE'
      AND NEW.decommission_date IS NOT DISTINCT FROM OLD.decommission_date  -- Datum nicht manuell mitgeändert
      AND NEW.first_registration IS DISTINCT FROM OLD.first_registration    -- Erstzulassung geändert
      AND OLD.first_registration IS NOT NULL
      AND OLD.decommission_date IS NOT DISTINCT FROM (OLD.first_registration + 180) -- bisher war es der AUTO-Wert
    THEN
      -- Nur den abgeleiteten Auto-Wert nachziehen; ein Hand-Datum bleibt unberührt.
      NEW.decommission_date := NEW.first_registration + 180;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
