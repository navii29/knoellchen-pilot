-- ============================================
-- KNÖLLCHEN-PILOT — Migration 014
-- LexOffice-Integration: API-Key auf Org-Ebene, optionaler Toggle,
-- pro Vertrag und Ticket eine Referenz auf die LexOffice-Rechnung.
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS lexoffice_api_key TEXT,
  ADD COLUMN IF NOT EXISTS lexoffice_enabled BOOLEAN DEFAULT false;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS lexoffice_invoice_id TEXT;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS lexoffice_invoice_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contracts_lexoffice ON contracts(lexoffice_invoice_id)
  WHERE lexoffice_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tickets_lexoffice ON tickets(lexoffice_invoice_id)
  WHERE lexoffice_invoice_id IS NOT NULL;
