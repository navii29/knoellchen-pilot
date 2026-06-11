-- ============================================
-- KNÖLLCHEN-PILOT — Migration 028
-- Shopify-Anbindung: Bestellungen aus dem Shop werden als Kunde + Vertrag
-- übernommen. shopify_order_id verhindert Dubletten (Shopify sendet Webhooks
-- bei Timeouts mehrfach), shopify_customer_id erlaubt sauberes Kunden-Matching.
-- ============================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS shopify_order_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shopify_customer_id TEXT;

-- Eine Shopify-Bestellung darf pro Organisation nur einen Vertrag erzeugen.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contracts_shopify_order
  ON contracts(org_id, shopify_order_id)
  WHERE shopify_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_shopify
  ON customers(org_id, shopify_customer_id)
  WHERE shopify_customer_id IS NOT NULL;
