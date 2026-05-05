-- ============================================
-- KNÖLLCHEN-PILOT — Migration 015
-- Echoes.solutions GPS-Integration: API-Key + Account-ID + Toggle auf
-- Org-Ebene, Tracker-Zuordnung + zuletzt bekannte Position pro Fahrzeug.
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS echoes_api_key    TEXT,
  ADD COLUMN IF NOT EXISTS echoes_account_id TEXT,
  ADD COLUMN IF NOT EXISTS echoes_enabled    BOOLEAN DEFAULT false;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS echoes_device_id TEXT,
  ADD COLUMN IF NOT EXISTS last_gps_lat     DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS last_gps_lng     DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS last_gps_update  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vehicles_echoes_device
  ON vehicles(echoes_device_id)
  WHERE echoes_device_id IS NOT NULL;
