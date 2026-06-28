-- ============================================
-- KNÖLLCHEN-PILOT — Migration 070
-- Pfad zum bei der Genehmigung erzeugten "Nachtrag zum Mietvertrag"-PDF
-- (Verlängerungs-Beleg), gespeichert im Bucket "generated-docs". Pro
-- Verlängerung (extension-Zeile) ein eigener Nachtrag → eigener Pfad, kein
-- Überschreiben. Nullable (best-effort: schlägt die Erzeugung fehl, bleibt es
-- NULL, die Genehmigung gilt trotzdem). Keine RLS-Änderung.
-- ============================================

ALTER TABLE contract_extensions ADD COLUMN IF NOT EXISTS addendum_pdf_path TEXT;
