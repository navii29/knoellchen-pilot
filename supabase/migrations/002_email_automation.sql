-- ============================================
-- KNÖLLCHEN-PILOT — Migration 002
-- E-Mail-Automation: Inbound (Postmark Webhook) + Outbound (Postmark API)
-- ============================================

-- Slug + Inbound-Adresse + Absender-Konfiguration auf Org-Ebene
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS inbound_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_automation_enabled BOOLEAN DEFAULT false;

-- Versand-/Empfangs-Tracking pro Ticket
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS inbound_email_id TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS letter_sent_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS letter_sent_to TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS authority_sent_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS authority_sent_to TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS authority_email TEXT;

-- Slug-Generator (deutsche Umlaute werden zu ae/oe/ue)
CREATE OR REPLACE FUNCTION public.generate_slug(name TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s TEXT;
BEGIN
  s := lower(name);
  s := replace(s, 'ä', 'ae');
  s := replace(s, 'ö', 'oe');
  s := replace(s, 'ü', 'ue');
  s := replace(s, 'ß', 'ss');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  RETURN s;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_tickets_inbound_email_id ON tickets(inbound_email_id);
