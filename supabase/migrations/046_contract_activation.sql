-- ============================================
-- KNÖLLCHEN-PILOT — Migration 046
-- Vertrags-Aktivierung: Rechnungsstellung wird MANUELL über "Aktivieren"
-- angestoßen (nicht automatisch). So lassen sich Altverträge gefahrlos
-- einpflegen, ohne Rechnungen auszulösen.
-- Kaution wird als EIGENE, steuerneutrale Rechnung erfasst (deposit_invoice_id).
-- (payment_status / paid_at existieren bereits aus Migration 039.)
-- ============================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_activated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deposit_invoice_id TEXT; -- LexOffice-ID der separaten Kautions-Rechnung
