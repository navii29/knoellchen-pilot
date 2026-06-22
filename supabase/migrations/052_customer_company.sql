-- ============================================
-- KNÖLLCHEN-PILOT — Migration 052
-- Firmenkunden: Kunden können Privatperson ODER Firma sein. Firmen haben einen
-- Firmennamen + Rechtsform (GmbH, UG, AG …) statt Vor-/Nachname. Der angezeigte
-- Name (last_name) wird für Firmen mit "Firmenname Rechtsform" gespiegelt, damit
-- bestehende Verträge/PDFs/Rechnungen unverändert weiterfunktionieren.
-- ============================================

ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type TEXT NOT NULL DEFAULT 'privat'; -- 'privat' | 'firma'
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS legal_form TEXT; -- GmbH, UG (haftungsbeschränkt), AG …
