-- ============================================
-- KNÖLLCHEN-PILOT — Migration 034
-- Mietverlängerungs-Anfragen aus dem Portal (vom Betreiber zu bestätigen).
-- ============================================

CREATE TABLE IF NOT EXISTS contract_extensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  current_return_date DATE,
  requested_return_date DATE NOT NULL,
  requested_return_time TEXT,
  extra_days INTEGER,
  est_cost DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'angefragt',   -- angefragt | bestaetigt | abgelehnt
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contract_extensions_contract ON contract_extensions(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_extensions_org ON contract_extensions(org_id);

ALTER TABLE contract_extensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Extensions by org" ON contract_extensions;
CREATE POLICY "Extensions by org" ON contract_extensions
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "portal own extensions" ON contract_extensions;
CREATE POLICY "portal own extensions" ON contract_extensions
  FOR SELECT USING (
    customer_id = public.portal_customer_id() AND org_id = public.portal_org_id()
  );
