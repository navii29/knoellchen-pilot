-- ============================================
-- KNÖLLCHEN-PILOT — Migration 030
-- Shopify-Self-Service: Jede Organisation hinterlegt ihre eigenen
-- Shop-Zugangsdaten in den Einstellungen (wie LexOffice/Echoes).
-- shopify_webhook_token sichert die org-spezifische Webhook-URL ab
-- und wird serverseitig beim ersten Speichern generiert.
-- ============================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS shopify_shop_domain TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS shopify_admin_token TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS shopify_webhook_token TEXT;
