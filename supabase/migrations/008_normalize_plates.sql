-- ============================================
-- KNÖLLCHEN-PILOT — Migration 008
-- Kennzeichen-Normalisierung für robustes Matching.
-- Entfernt Leerzeichen + setzt einen Bindestrich nach dem Stadtcode.
-- "M-C 3116" / "M C 3116" / "m-c-3116" → "M-C3116"
-- ============================================

CREATE OR REPLACE FUNCTION public.normalize_plate(plate TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  cleaned TEXT;
  m TEXT[];
BEGIN
  IF plate IS NULL OR plate = '' THEN
    RETURN '';
  END IF;
  -- Uppercase + alles raus was kein Buchstabe/Ziffer ist
  cleaned := upper(regexp_replace(plate, '[^A-Za-zÄÖÜäöü0-9]', '', 'g'));

  -- Standard-Pattern (Stadt 1-3, Letters 1-2, Numbers 1-4, Suffix optional E/H)
  m := regexp_match(cleaned, '^([A-ZÄÖÜ]{1,3})([A-ZÄÖÜ]{1,2})(\d{1,4})([EH]?)$');
  IF m IS NOT NULL THEN
    RETURN m[1] || '-' || m[2] || m[3] || COALESCE(m[4], '');
  END IF;

  -- Fallback: nur cleaned zurück
  RETURN cleaned;
END;
$$;

-- Existing-Daten einmalig normalisieren
UPDATE vehicles
SET plate = public.normalize_plate(plate)
WHERE plate IS NOT NULL AND plate <> public.normalize_plate(plate);

UPDATE contracts
SET plate = public.normalize_plate(plate)
WHERE plate IS NOT NULL AND plate <> public.normalize_plate(plate);

UPDATE tickets
SET plate = public.normalize_plate(plate)
WHERE plate IS NOT NULL AND plate <> public.normalize_plate(plate);
