-- ============================================
-- KNÖLLCHEN-PILOT — Migration 064
-- Fix einer Regression aus Migration 063: dort wurde vehicle_type bei JEDEM
-- INSERT bedingungslos aus manufacturer/model neu gebaut. Der Trigger feuert
-- aber `BEFORE INSERT OR UPDATE OF manufacturer, model` — die `OF`-Spaltenliste
-- gilt in Postgres NUR fuer UPDATE; bei INSERT feuert er IMMER. Ein INSERT mit
-- explizit gesetztem vehicle_type, aber OHNE manufacturer/model (legitimer
-- Pfad in POST /api/vehicles, Backwards-Compat), bekam dadurch vehicle_type
-- faelschlich auf NULL gesetzt.
--
-- Korrektur per TG_OP:
--   INSERT  -> expliziten vehicle_type respektieren; nur ableiten, wenn
--              manufacturer ODER model gesetzt sind.
--   UPDATE  -> feuert ohnehin nur bei Aenderung von manufacturer/model, daher
--              vehicle_type bedingungslos neu ableiten (inkl. NULL, wenn BEIDE
--              Quellfelder geleert wurden — das war das Ziel von Migration 063).
--
-- Trigger-DEFINITION bleibt unveraendert; nur der Funktionsrumpf wird ersetzt.
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_vehicle_type() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.manufacturer IS NOT NULL OR NEW.model IS NOT NULL THEN
      NEW.vehicle_type := NULLIF(
        trim(both ' ' from COALESCE(NEW.manufacturer, '') || ' ' || COALESCE(NEW.model, '')),
        ''
      );
    END IF;
  ELSE
    NEW.vehicle_type := NULLIF(
      trim(both ' ' from COALESCE(NEW.manufacturer, '') || ' ' || COALESCE(NEW.model, '')),
      ''
    );
  END IF;
  RETURN NEW;
END;
$$;
