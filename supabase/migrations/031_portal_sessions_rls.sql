-- ============================================
-- KNÖLLCHEN-PILOT — Migration 031
-- Portal-Sessions (Revocation / Logout-everywhere) + DB-enforced RLS
-- für das Kundenportal. Portal-JWTs tragen role=authenticated + Claims
-- customer_id/org_id/session_id; diese Policies sind ADDITIV zu den
-- bestehenden Operator-Policies (current_org_id()).
-- ============================================

-- 1) Session-Tabelle (eine Zeile pro Login/Gerät; Refresh-Token gehasht)
CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  login_id UUID REFERENCES customer_logins(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  refresh_hash TEXT NOT NULL,            -- sha256(refresh token)
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,       -- refresh expiry (e.g. 30d)
  revoked_at TIMESTAMPTZ                 -- non-null ⇒ dead
);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_customer ON portal_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_refresh ON portal_sessions(refresh_hash);

-- 2) Claim-Helper (lesen die JWT-Claims des Portal-Tokens)
CREATE OR REPLACE FUNCTION public.portal_customer_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'customer_id','')::uuid
$$;
CREATE OR REPLACE FUNCTION public.portal_org_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id','')::uuid
$$;

-- 3) RLS auf portal_sessions
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal own sessions" ON portal_sessions;
CREATE POLICY "portal own sessions" ON portal_sessions
  FOR SELECT USING (customer_id = public.portal_customer_id());

-- 4) ADDITIVE Portal-Policies auf bestehende Tabellen
--    (permissiv ⇒ OR mit den Operator-Policies; Operatoren bleiben unberührt)
DROP POLICY IF EXISTS "portal self customer" ON customers;
CREATE POLICY "portal self customer" ON customers
  FOR SELECT USING (id = public.portal_customer_id() AND org_id = public.portal_org_id());
DROP POLICY IF EXISTS "portal self customer upd" ON customers;
CREATE POLICY "portal self customer upd" ON customers
  FOR UPDATE USING (id = public.portal_customer_id() AND org_id = public.portal_org_id())
            WITH CHECK (id = public.portal_customer_id() AND org_id = public.portal_org_id());

DROP POLICY IF EXISTS "portal own contracts" ON contracts;
CREATE POLICY "portal own contracts" ON contracts
  FOR SELECT USING (customer_id = public.portal_customer_id() AND org_id = public.portal_org_id());

DROP POLICY IF EXISTS "portal own tickets" ON tickets;
CREATE POLICY "portal own tickets" ON tickets
  FOR SELECT USING (
    org_id = public.portal_org_id()
    AND contract_id IN (SELECT id FROM contracts WHERE customer_id = public.portal_customer_id())
  );

-- 5) Storage: Portal darf nur eigene Objekte im Bucket 'portal-uploads' lesen
--    (Pfad-Konvention org_id/customer_id/...)
DROP POLICY IF EXISTS "portal own uploads read" ON storage.objects;
CREATE POLICY "portal own uploads read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'portal-uploads'
    AND (storage.foldername(name))[1] = public.portal_org_id()::text
    AND (storage.foldername(name))[2] = public.portal_customer_id()::text
  );
