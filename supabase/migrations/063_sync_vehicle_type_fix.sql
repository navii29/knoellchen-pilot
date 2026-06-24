-- ============================================
-- KNÖLLCHEN-PILOT — Migration 063
-- Fix: sync_vehicle_type() leitet vehicle_type IMMER aus manufacturer/model ab.
--
-- Vorher (Migration 009) lief der Rebuild nur, wenn manufacturer ODER model
-- NICHT NULL war:
--     IF NEW.manufacturer IS NOT NULL OR NEW.model IS NOT NULL THEN ...
-- Werden in einem UPDATE BEIDE Felder auf NULL gesetzt, blieb der ALTE
-- vehicle_type stehen (verwaister Stand: leere Stammdaten, aber gefüllter Typ).
-- Da der Trigger nur bei Änderung von manufacturer/model feuert, ist die
-- Funktion hier die richtige Stelle: vehicle_type wird nun bedingungslos neu
-- gebaut und auf NULL gesetzt, wenn beide Quellfelder leer sind.
--
-- Die Trigger-DEFINITION bleibt unverändert (feuert weiterhin auf
-- INSERT OR UPDATE OF manufacturer, model) — nur der Funktionsrumpf wird
-- ersetzt. Signatur identisch zu Migration 009.
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_vehicle_type() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.vehicle_type := NULLIF(
    trim(both ' ' from COALESCE(NEW.manufacturer, '') || ' ' || COALESCE(NEW.model, '')),
    ''
  );
  RETURN NEW;
END;
$$;
