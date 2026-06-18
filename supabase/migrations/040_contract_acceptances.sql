-- ============================================
-- KNÖLLCHEN-PILOT — Migration 040
-- Pro-Block-Zustimmung zu AGB + Sondervereinbarungen bei der Unterschrift
-- (Text-Snapshot + Zeitstempel + IP) — revisionssicherer Nachweis.
-- ============================================

CREATE TABLE IF NOT EXISTS contract_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  block_key TEXT NOT NULL,        -- 'agb' | 'special:<id>'
  block_title TEXT,
  text_snapshot TEXT,
  accepted_at TIMESTAMPTZ DEFAULT now(),
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_contract_acceptances_contract ON contract_acceptances(contract_id);

ALTER TABLE contract_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceptances by org" ON contract_acceptances;
CREATE POLICY "Acceptances by org" ON contract_acceptances
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "portal own acceptances" ON contract_acceptances;
CREATE POLICY "portal own acceptances" ON contract_acceptances
  FOR SELECT USING (
    customer_id = public.portal_customer_id() AND org_id = public.portal_org_id()
  );
