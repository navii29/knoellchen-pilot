-- ============================================
-- KNÖLLCHEN-PILOT — Migration 050
-- Entwurf-/Unvollständig-Flag: ein Fahrzeug, das direkt nach dem Auslesen eines
-- Fahrzeugscheins automatisch gespeichert wurde, ist als "unvollständig" markiert
-- (Liste zeigt einen Hinweis), bis die Daten bewusst gespeichert/ergänzt werden.
-- ============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS incomplete BOOLEAN NOT NULL DEFAULT false;
