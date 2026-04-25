-- ============================================
-- KNÖLLCHEN-PILOT — Migration 010
-- Strafzettel-Kosten als bearbeitbare Aufschlüsselung:
-- Bußgeld optional weiterbelasten, Bearbeitungsgebühr netto/MwSt/brutto.
-- ============================================

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS charge_fine BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS charge_fee BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS fee_net DECIMAL(10,2);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS fee_vat DECIMAL(10,2);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS fee_gross DECIMAL(10,2);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS total_charge DECIMAL(10,2);

-- Bestand: bestehende Tickets mit processing_fee (das war bisher BRUTTO eingegeben)
-- als brutto-Wert übernehmen und Netto + MwSt rückrechnen.
UPDATE tickets
SET
  fee_gross = COALESCE(processing_fee, 0),
  fee_net   = ROUND(COALESCE(processing_fee, 0) / 1.19, 2),
  fee_vat   = ROUND(COALESCE(processing_fee, 0) - (COALESCE(processing_fee, 0) / 1.19), 2),
  total_charge =
    CASE WHEN charge_fine THEN COALESCE(fine_amount, 0) ELSE 0 END
    + CASE WHEN charge_fee  THEN COALESCE(processing_fee, 0) ELSE 0 END
WHERE fee_gross IS NULL;
