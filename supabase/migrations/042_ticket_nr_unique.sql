-- ============================================
-- KNÖLLCHEN-PILOT — Migration 042
-- Strafzettel-Nummer pro Organisation eindeutig. Verhindert doppelte
-- ticket_nr (mehrdeutige Zuordnung → Gefahr, den falschen Strafzettel dem
-- falschen Vertrag weiterzubelasten).
--
-- HINWEIS: Falls in einer Org bereits Duplikate existieren, schlägt das
-- CREATE UNIQUE INDEX fehl. Vorher prüfen/bereinigen:
--   select org_id, ticket_nr, count(*) from tickets
--   group by org_id, ticket_nr having count(*) > 1;
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_org_ticket_nr
  ON tickets (org_id, ticket_nr);
