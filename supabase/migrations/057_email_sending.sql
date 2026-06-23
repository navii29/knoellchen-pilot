-- ============================================
-- KNÖLLCHEN-PILOT — Migration 057
-- Dokumentenversand per E-Mail von eigener, verifizierter Absenderdomain.
--
-- Der Betreiber hinterlegt eine eigene Sende-Domain (Shopify-Prinzip: mehrere
-- CNAME-Einträge setzen → verifizieren → von der eigenen Domain senden). Damit
-- kann ein vorbereiteter Mietvertrag mit angehängtem PDF an den Kunden gesendet
-- werden — abgesendet über die verifizierte Domain der Organisation.
--
-- Sicherheit: Der Plattform-API-Key (RESEND_API_KEY) liegt AUSSCHLIESSLICH als
-- Server-Env-Variable vor — er ist NICHT pro Org und wird NICHT in der DB
-- gespeichert. Die hier gespeicherten Felder (Domain-ID / DNS-Records / Status)
-- sind unkritisch und für den Betreiber sichtbar.
--
-- Hinweis: Die Absenderadresse/-name werden über die BESTEHENDEN Spalten
-- sender_email / sender_name abgebildet (keine Duplikate).
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email_provider         TEXT DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS email_domain           TEXT,
  ADD COLUMN IF NOT EXISTS email_domain_id        TEXT,
  ADD COLUMN IF NOT EXISTS email_domain_status    TEXT DEFAULT 'none', -- 'none' | 'pending' | 'verified' | 'failed'
  ADD COLUMN IF NOT EXISTS email_dns_records      JSONB,
  ADD COLUMN IF NOT EXISTS contract_email_subject TEXT,
  ADD COLUMN IF NOT EXISTS contract_email_body    TEXT;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sent_to TEXT;
