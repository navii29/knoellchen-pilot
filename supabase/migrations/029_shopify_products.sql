-- ============================================
-- KNÖLLCHEN-PILOT — Migration 029
-- Shopify products/create: neu angelegte Shop-Produkte (SKU = Kennzeichen)
-- werden automatisch als Fahrzeuge übernommen. shopify_product_id verhindert
-- Dubletten bei Webhook-Retries und erlaubt spätere Synchronisierung.
-- ============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS shopify_product_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_shopify_product
  ON vehicles(org_id, shopify_product_id)
  WHERE shopify_product_id IS NOT NULL;
