-- ============================================
-- KNÖLLCHEN-PILOT — Migration 071
-- Signaturfelder für den "Nachtrag zum Mietvertrag" auf contract_extensions —
-- erlaubt einen vom Mieter im Portal digital signierten Nachtrag (analog zu
-- contracts.signed_*). Alle Felder nullable (ein Nachtrag kann unsigniert
-- bleiben). Das signierte PDF liegt GETRENNT vom unsignierten addendum_pdf_path
-- (Migration 070), damit das Original erhalten bleibt.
--
-- Audit (Weg b): contract_acceptances bekommt eine extension_id-FK, damit die
-- Nachtrag-Zustimmung exakt einer Verlängerung zugeordnet werden kann (statt
-- einer block_key-String-Konvention). ON DELETE CASCADE hält die Integrität.
--
-- Keine RLS-Änderung: Schreiben erfolgt ausschließlich via Service-Role (admin)
-- in der späteren Sign-Route. Die Policies "portal own extensions" (Migration
-- 034) und "portal own acceptances" (Migration 040) sind zeilenbasiert FOR
-- SELECT OHNE Spaltenliste → decken die neuen Spalten automatisch mit ab
-- (Mieter darf seinen Signaturstatus lesen).
-- ============================================

-- Signaturfelder für den signierten Nachtrag (alle nullable).
ALTER TABLE contract_extensions
  ADD COLUMN IF NOT EXISTS addendum_signature_data TEXT,
  ADD COLUMN IF NOT EXISTS addendum_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS addendum_signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS addendum_signed_path TEXT;

-- Audit (b): exakte Zuordnung der Nachtrag-Zustimmung zu einer Verlängerung.
ALTER TABLE contract_acceptances
  ADD COLUMN IF NOT EXISTS extension_id UUID
    REFERENCES contract_extensions(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_contract_acceptances_extension
  ON contract_acceptances(extension_id);

-- ============================================
-- ROLLBACK (manuell ausführen, falls nötig):
-- ============================================
-- DROP INDEX IF EXISTS idx_contract_acceptances_extension;
-- ALTER TABLE contract_acceptances DROP COLUMN IF EXISTS extension_id;
-- ALTER TABLE contract_extensions
--   DROP COLUMN IF EXISTS addendum_signature_data,
--   DROP COLUMN IF EXISTS addendum_signed_at,
--   DROP COLUMN IF EXISTS addendum_signed_ip,
--   DROP COLUMN IF EXISTS addendum_signed_path;
