-- ============================================
-- KNÖLLCHEN-PILOT — Migration 054
-- Frei konfigurierbare Mitarbeiter-Rechte. users.role bleibt ('owner' | 'member');
-- der Inhaber (owner) hat IMMER alle Rechte. Für Mitarbeiter pflegt der Inhaber
-- pro Person eine Rechte-Liste. Margen/Kosten/Partner bleiben strikt owner-only
-- und sind NICHT über diese Liste vergebbar.
-- ============================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL
  DEFAULT ARRAY['settings', 'delete', 'import_export', 'create_master_data']::text[];

-- Bestandskunden: bisherige Mitarbeiter behalten ihre gewohnte Reichweite
-- (alles außer den ohnehin owner-only-Bereichen). 'monitoring' ist neu und
-- standardmäßig AUS, der Inhaber kann es gezielt freigeben.
UPDATE users
  SET permissions = ARRAY['settings', 'delete', 'import_export', 'create_master_data']::text[]
  WHERE role <> 'owner';
