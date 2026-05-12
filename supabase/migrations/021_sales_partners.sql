-- ============================================
-- KNÖLLCHEN-PILOT — Migration 021
-- Vertriebspartner-Management mit Provisionsabrechnung.
-- Pro Fahrzeug+Partner ein Einstandspreis und VK-Preis. Pro Vertrag
-- wird der gewählte Partner samt berechneter Provision gespeichert.
-- ============================================

CREATE TABLE IF NOT EXISTS sales_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  name TEXT NOT NULL,
  type TEXT DEFAULT 'partner' CHECK (type IN (
    'hotel', 'agency', 'portal', 'workshop', 'other', 'partner'
  )),
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_number TEXT,

  commission_type TEXT DEFAULT 'fixed' CHECK (commission_type IN (
    'fixed', 'percent', 'margin'
  )),
  commission_value DECIMAL(10, 2),

  active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_partner_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES sales_partners(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  purchase_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vehicle_id, partner_id)
);

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES sales_partners(id),
  ADD COLUMN IF NOT EXISTS partner_purchase_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS partner_selling_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS partner_commission DECIMAL(10, 2);

ALTER TABLE sales_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_partner_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partners by org" ON sales_partners;
CREATE POLICY "Partners by org" ON sales_partners
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Partner pricing by org" ON vehicle_partner_pricing;
CREATE POLICY "Partner pricing by org" ON vehicle_partner_pricing
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_sales_partners_org ON sales_partners(org_id);
CREATE INDEX IF NOT EXISTS idx_partner_pricing_vehicle ON vehicle_partner_pricing(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_partner_pricing_partner ON vehicle_partner_pricing(partner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_partner ON contracts(partner_id) WHERE partner_id IS NOT NULL;
