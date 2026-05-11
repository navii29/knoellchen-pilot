-- ============================================
-- KNÖLLCHEN-PILOT — Migration 018
-- Kundenportal: separates Auth-System für Mieter (KEIN Supabase Auth).
-- E-Mail + bcrypt-Hash ODER Magic-Link, JWT-basierte Session.
-- ============================================

CREATE TABLE IF NOT EXISTS customer_logins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  email TEXT NOT NULL,
  password_hash TEXT,                      -- nullable: Magic-Link-only Logins erlaubt
  magic_token TEXT,
  magic_token_expires TIMESTAMPTZ,

  last_login TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(org_id, email)
);

ALTER TABLE customer_logins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer logins by org" ON customer_logins;
CREATE POLICY "Customer logins by org" ON customer_logins
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_customer_logins_email ON customer_logins(email);
CREATE INDEX IF NOT EXISTS idx_customer_logins_magic
  ON customer_logins(magic_token)
  WHERE magic_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_logins_customer
  ON customer_logins(customer_id);

-- Bucket für Profil-Updates aus dem Portal (Selfie-Führerschein etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-uploads', 'portal-uploads', false)
ON CONFLICT (id) DO NOTHING;
