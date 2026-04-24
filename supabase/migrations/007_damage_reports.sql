-- ============================================
-- KNÖLLCHEN-PILOT — Migration 007
-- Schadensberichte: Unfälle, Vandalismus, Schäden während Mietzeit.
-- Mit Foto-Galerie + Versicherungs-/Polizei-Tracking.
-- ============================================

CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  date DATE NOT NULL,
  time TEXT,
  location TEXT,
  description TEXT,

  police_reference_nr TEXT,
  insurance_claim_nr TEXT,

  other_party_name TEXT,
  other_party_plate TEXT,
  other_party_insurance TEXT,

  photos JSONB DEFAULT '[]'::jsonb,

  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'gemeldet', 'reguliert')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Damage reports by org" ON damage_reports;
CREATE POLICY "Damage reports by org" ON damage_reports
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_damage_reports_org      ON damage_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_contract ON damage_reports(contract_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_vehicle  ON damage_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_damage_reports_date     ON damage_reports(org_id, date DESC);

DROP TRIGGER IF EXISTS trg_damage_reports_updated_at ON damage_reports;
CREATE TRIGGER trg_damage_reports_updated_at
  BEFORE UPDATE ON damage_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('damage-photos', 'damage-photos', false)
ON CONFLICT (id) DO NOTHING;
