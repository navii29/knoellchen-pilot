-- ============================================
-- KNÖLLCHEN-PILOT — Migration 006
-- Übergabe-Fotos pro Vertrag mit 10 vordefinierten Positionen.
-- Genutzt für Schadens-Dokumentation und Vorher/Nachher-Vergleich via Claude Vision.
-- ============================================

CREATE TABLE IF NOT EXISTS handover_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  type TEXT NOT NULL CHECK (type IN ('pickup', 'return')),
  position TEXT NOT NULL CHECK (position IN (
    'front', 'rear', 'left', 'right',
    'front_left', 'front_right', 'rear_left', 'rear_right',
    'interior', 'dashboard'
  )),

  photo_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- pro Vertrag/Position/Typ nur ein Foto (überschreiben statt duplizieren)
  UNIQUE(contract_id, type, position)
);

ALTER TABLE handover_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Handover photos by org" ON handover_photos;
CREATE POLICY "Handover photos by org" ON handover_photos
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_handover_contract ON handover_photos(contract_id);
CREATE INDEX IF NOT EXISTS idx_handover_org      ON handover_photos(org_id);

-- Storage-Bucket für die Fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('handover-photos', 'handover-photos', false)
ON CONFLICT (id) DO NOTHING;
