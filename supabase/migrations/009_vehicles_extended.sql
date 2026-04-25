-- ============================================
-- KNÖLLCHEN-PILOT — Migration 009
-- Vollständige Fahrzeug-Stammdaten für eine professionelle Autovermietung.
-- Stammdaten, Verfügbarkeit/Kilometer, Preise, Sonstiges + Status-Workflow.
-- ============================================

-- Stammdaten
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS power_ps INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transmission TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS doors TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS seats INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS luggage INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS body_type TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fin_number TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS category TEXT;

-- Verfügbarkeit & Kilometer
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS available_from DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS km_at_intake INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS max_km_total INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS inclusive_km_month INTEGER;

-- Preise
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS weekly_rate DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS deposit DECIMAL(10,2);

-- Sonstiges
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS accessories TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aktiv'
  CHECK (status IN ('aktiv', 'inaktiv', 'werkstatt', 'ausgesteuert'));

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Trigger: updated_at pflegen (set_updated_at() existiert seit Migration 003)
DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles;
CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_vehicles_status       ON vehicles(org_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_manufacturer ON vehicles(org_id, manufacturer);
CREATE INDEX IF NOT EXISTS idx_vehicles_fin         ON vehicles(org_id, fin_number);

-- vehicle_type bleibt als kombiniertes Feld (Anzeige in Listen, Strafzettel-Templates).
-- Auto-Sync via Trigger: bei Änderung von manufacturer/model wird vehicle_type neu gebaut.
CREATE OR REPLACE FUNCTION public.sync_vehicle_type() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.manufacturer IS NOT NULL OR NEW.model IS NOT NULL THEN
    NEW.vehicle_type := trim(both ' ' from
      COALESCE(NEW.manufacturer, '') || ' ' || COALESCE(NEW.model, '')
    );
    IF NEW.vehicle_type = '' THEN
      NEW.vehicle_type := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_sync_type ON vehicles;
CREATE TRIGGER trg_vehicles_sync_type
  BEFORE INSERT OR UPDATE OF manufacturer, model ON vehicles
  FOR EACH ROW EXECUTE FUNCTION public.sync_vehicle_type();

-- Bestand: bestehende vehicle_type Werte beibehalten — keine Backfill-Aktion.
-- Neue Inserts/Updates ohne explizite manufacturer/model lassen vehicle_type unverändert.
