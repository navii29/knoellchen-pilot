-- ============================================
-- KNÖLLCHEN-PILOT — Migration 065
-- Datenübernahme aus Verträgen: neue Stammdatenfelder auf customers +
-- Spiegelfelder auf contracts, damit ein Vertrag den vollen Kundendatensatz
-- trägt und Kunde/Fahrzeug automatisch angelegt/abgeglichen werden können.
-- ============================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS birth_place       TEXT,
  ADD COLUMN IF NOT EXISTS id_card_authority TEXT,
  ADD COLUMN IF NOT EXISTS license_issued    DATE,
  ADD COLUMN IF NOT EXISTS iban              TEXT,
  ADD COLUMN IF NOT EXISTS bank_holder       TEXT,
  ADD COLUMN IF NOT EXISTS bic               TEXT;

-- Vertrag trägt den vollen Mieter-Datensatz. Datumsfelder als TEXT (konsistent
-- mit bestehendem renter_birthday/renter_license_expiry, die ebenfalls TEXT
-- sind) — die Normalisierung zu DATE passiert beim Schreiben in customers.
-- weekly_rate/monthly_rate werden NUR auf contracts ergänzt (auf vehicles
-- existieren sie bereits, Migration 009).
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS renter_birthplace         TEXT,
  ADD COLUMN IF NOT EXISTS renter_id_card_nr         TEXT,
  ADD COLUMN IF NOT EXISTS renter_id_card_authority  TEXT,
  ADD COLUMN IF NOT EXISTS renter_license_issued     TEXT,
  ADD COLUMN IF NOT EXISTS renter_iban               TEXT,
  ADD COLUMN IF NOT EXISTS renter_bank_holder        TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color             TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_fin               TEXT,
  ADD COLUMN IF NOT EXISTS weekly_rate               DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS monthly_rate              DECIMAL(10,2);

-- Match-Index für den Führerschein-Nr-Lookup (ensure-customer Einzel-Lookup).
CREATE INDEX IF NOT EXISTS idx_customers_license ON customers(org_id, license_nr);
