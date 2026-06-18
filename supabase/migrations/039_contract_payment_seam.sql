-- ============================================
-- KNÖLLCHEN-PILOT — Migration 039
-- Payment-Seam-Spalten auf contracts (analog zu tickets/032). Die eigentliche
-- Online-Bezahlung (Stripe) folgt später; diese Spalten machen sie drop-in.
-- ============================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_status TEXT;   -- null | 'offen' | 'bezahlt'
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
