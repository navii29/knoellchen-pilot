-- ============================================
-- KNÖLLCHEN-PILOT — Migration 032
-- Strafzettel-Self-Service: Fahrer-Bestätigung (Acknowledgment), Einspruch
-- ("Ich war nicht der Fahrer"), und Payment-Seam-Spalten (Stripe folgt später).
-- ============================================

-- Payment-Seam + Acknowledgment-Spalten auf tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS payment_status TEXT;       -- null | 'offen' | 'bezahlt'
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS acknowledged_ip TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS dispute_status TEXT;       -- null | 'offen' | 'geprueft' | 'abgelehnt' | 'akzeptiert'

-- Einspruch / Fahrerbenennung
CREATE TABLE IF NOT EXISTS ticket_disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  kind TEXT NOT NULL,                  -- 'not_driver' | 'objection'
  reason TEXT,
  named_driver_name TEXT,
  named_driver_address TEXT,
  named_driver_email TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_disputes_ticket ON ticket_disputes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_disputes_org ON ticket_disputes(org_id);

ALTER TABLE ticket_disputes ENABLE ROW LEVEL SECURITY;

-- Operator (Supabase-Auth) verwaltet die Einsprüche seiner Org.
DROP POLICY IF EXISTS "Disputes by org" ON ticket_disputes;
CREATE POLICY "Disputes by org" ON ticket_disputes
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

-- Portal-Kunde darf die EIGENEN Einsprüche lesen. Das Anlegen läuft serverseitig
-- über den Admin-Client mit Ownership-Check (tickets hat keine Spalten-RLS, daher
-- KEINE breite Portal-UPDATE-Policy auf tickets — nur lesen).
DROP POLICY IF EXISTS "portal own disputes" ON ticket_disputes;
CREATE POLICY "portal own disputes" ON ticket_disputes
  FOR SELECT USING (
    customer_id = public.portal_customer_id() AND org_id = public.portal_org_id()
  );
