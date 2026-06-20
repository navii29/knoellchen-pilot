-- ============================================
-- KNÖLLCHEN-PILOT — Migration 043
-- Fahrzeugschein-Auslesen (Zulassungsbescheinigung Teil I).
-- Zusätzliche technische Felder, die per KI aus dem Schein extrahiert werden.
-- Die bekannten Felder (manufacturer, model, first_registration, color,
-- fuel_type, power_ps, fin_number, seats, body_type) existieren bereits.
-- Hier kommen die restlichen Schein-Daten dazu + ein JSONB-Vollabzug,
-- damit WIRKLICH alle ausgelesenen Daten erhalten bleiben.
-- ============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS hsn TEXT;               -- Feld 2.1 — Herstellerschlüsselnummer
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tsn TEXT;               -- Feld 2.2 — Typschlüsselnummer
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS displacement_ccm INTEGER; -- Feld P.1 — Hubraum in cm³
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS co2_combined INTEGER;   -- Feld V.7 — CO₂ kombiniert g/km
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS emission_class TEXT;    -- Feld 14 — Emissionsklasse (z. B. EURO6)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS weight_empty INTEGER;   -- Feld G — Leermasse in kg
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS weight_max INTEGER;     -- Feld F.1 — techn. zul. Gesamtmasse in kg
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS zb2_number TEXT;        -- Feld 16 — Nummer der Zulassungsbescheinigung Teil II
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS next_hu DATE;           -- Feld X — nächste Hauptuntersuchung (HU/TÜV)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_data JSONB; -- vollständiger KI-Auslese-Datensatz
