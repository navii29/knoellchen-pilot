-- ============================================
-- KNÖLLCHEN-PILOT — Migration 044
-- Versicherungs-Position am Fahrzeug: Police + Karte (Dokumente) sowie
-- Stammdaten (Versicherer, Policennummer, gültig bis). Dokumente liegen im
-- Bucket "vehicle-documents" und werden über /api/vehicles/[id]/insurance-doc
-- verwaltet (Slot = policy | card).
-- ============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurer TEXT;                -- Versicherer
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS policy_number TEXT;          -- Policennummer
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_valid_until DATE;  -- gültig bis
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_policy_path TEXT;  -- Versicherungspolice (Dokument)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_card_path TEXT;    -- Versicherungskarte / eVB (Dokument)
