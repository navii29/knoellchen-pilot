-- ============================================
-- KNÖLLCHEN-PILOT — Migration 026
-- Fahrzeug-Logistik: Fahrzeugschein, Fahrzeugfotos, Abhollager/Rückgabeort,
-- interne Rückgabe-Erfassung. Ausflottung nutzt die bestehenden Felder
-- (status='ausgesteuert' + decommission_date) — keine Schemaänderung nötig.
-- ============================================

-- Fahrzeugschein (Zulassungsbescheinigung Teil I) + Logistikfelder
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS registration_doc_path TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pickup_location TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS return_location TEXT;
-- "Rückgabe erfolgt am/um" — rein intern, nicht vertragsrelevant
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS internal_return_at TIMESTAMPTZ;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS internal_return_note TEXT;

-- Fotos vom tatsächlichen Fahrzeug
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  photo_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicle photos by org" ON vehicle_photos;
CREATE POLICY "Vehicle photos by org" ON vehicle_photos
  FOR ALL USING (org_id = (SELECT org_id FROM users WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle ON vehicle_photos(vehicle_id);

-- Storage-Bucket für Fahrzeugfotos (privat; Zugriff nur über signierte URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-photos', 'vehicle-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Der Fahrzeugschein nutzt den bestehenden privaten Bucket 'vehicle-documents'.
