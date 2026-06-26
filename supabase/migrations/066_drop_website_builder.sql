-- ============================================
-- KNÖLLCHEN-PILOT — Migration 066
-- Entfernt das "Mietseite"-Feature (Website-Builder aus Migration 061).
-- Der zugehörige Code wurde komplett entfernt; diese Tabellen werden nicht mehr
-- referenziert. Anwenden NUR, wenn die DB bereinigt werden soll — die Daten
-- (Templates/Seiten/Blöcke der öffentlichen Mietseite) gehen dabei verloren.
--
-- WICHTIG: organizations.slug und organizations.logo_path bleiben erhalten —
-- sie werden auch vom Kunden-Portal und den Vertrags-PDFs genutzt.
-- ============================================

DROP TABLE IF EXISTS site_blocks CASCADE;
DROP TABLE IF EXISTS site_pages CASCADE;
DROP TABLE IF EXISTS sites CASCADE;
