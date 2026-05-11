-- ============================================
-- KNÖLLCHEN-PILOT — Migration 017
-- Revenue Management: Preisregeln (Saison, Wochentag, Nachfrage,
-- Custom) und expliziter Basispreis pro Fahrzeug.
-- ============================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('season', 'weekday', 'demand', 'custom')),
  adjustment_percent DECIMAL(5, 2) NOT NULL,

  start_date DATE,
  end_date DATE,
  weekdays INTEGER[],
  min_fleet_available INTEGER,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pricing rules by org" ON pricing_rules;
CREATE POLICY "Pricing rules by org" ON pricing_rules
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_pricing_rules_org_active
  ON pricing_rules(org_id, active)
  WHERE active = true;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS base_daily_rate DECIMAL(10, 2);
