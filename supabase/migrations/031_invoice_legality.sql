-- ════════════════════════════════════════════════════════════════
-- 031 — Rechtssichere Rechnungen (§14 UStG)
--   * Bankverbindung der Organisation (IBAN/BIC/Kontoinhaber)
--   * Kleinunternehmer-Flag (§19 UStG) — keine USt. ausweisen
--   * Fortlaufende, eindeutige Rechnungsnummer pro Organisation
--     (ersetzt die kollidierende Date.now()-Vorgangs-Nr.)
-- ════════════════════════════════════════════════════════════════

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT,
  ADD COLUMN IF NOT EXISTS account_holder TEXT,
  ADD COLUMN IF NOT EXISTS kleinunternehmer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_seq INTEGER NOT NULL DEFAULT 0;

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS invoice_nr TEXT;

-- Pro Organisation eindeutig (NULL erlaubt für noch nicht erzeugte Rechnungen)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_invoice_nr
  ON tickets(org_id, invoice_nr)
  WHERE invoice_nr IS NOT NULL;

-- Atomare, fortlaufende Rechnungsnummer pro Org. Der UPDATE sperrt die
-- Org-Zeile, daher bekommen gleichzeitige Aufrufe garantiert verschiedene
-- Sequenzen (keine Doppelnummern).
CREATE OR REPLACE FUNCTION next_invoice_nr(p_org UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  UPDATE organizations
     SET invoice_seq = COALESCE(invoice_seq, 0) + 1
   WHERE id = p_org
  RETURNING invoice_seq INTO v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Organisation % nicht gefunden', p_org;
  END IF;

  RETURN 'RG-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 5, '0');
END;
$$;
