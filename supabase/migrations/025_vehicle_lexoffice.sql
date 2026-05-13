-- ============================================
-- Migration 025 — LexOffice-Artikel-Verknüpfung pro Fahrzeug
-- ============================================

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS lexoffice_product_id TEXT;

CREATE INDEX IF NOT EXISTS idx_vehicles_lexoffice_product
  ON vehicles(lexoffice_product_id)
  WHERE lexoffice_product_id IS NOT NULL;
