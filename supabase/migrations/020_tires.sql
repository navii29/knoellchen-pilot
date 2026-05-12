-- ============================================
-- KNÖLLCHEN-PILOT — Migration 020
-- Reifen-Tracking pro Fahrzeug: aktueller Satz + Historie + Fotos.
-- Ein Fahrzeug hat zu jedem Zeitpunkt höchstens einen aktuellen Satz
-- (is_current = true). Beim Wechsel wird der alte Satz dismounted und
-- der neue als is_current=true angelegt.
-- ============================================

CREATE TABLE IF NOT EXISTS vehicle_tires (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  type TEXT NOT NULL CHECK (type IN ('summer', 'winter', 'allseason')),
  brand TEXT,
  model TEXT,
  size TEXT,
  dot_number TEXT,

  tread_depth_fl DECIMAL(3, 1),
  tread_depth_fr DECIMAL(3, 1),
  tread_depth_rl DECIMAL(3, 1),
  tread_depth_rr DECIMAL(3, 1),

  km_at_mount INTEGER,
  mounted_at DATE,
  dismounted_at DATE,
  is_current BOOLEAN DEFAULT true,

  storage_location TEXT,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('new', 'good', 'worn', 'replace')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tire_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tire_id UUID REFERENCES vehicle_tires(id) ON DELETE CASCADE NOT NULL,
  position TEXT NOT NULL CHECK (position IN (
    'front_left', 'front_right', 'rear_left', 'rear_right', 'overview', 'tread'
  )),
  photo_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tire_id, position)
);

ALTER TABLE vehicle_tires ENABLE ROW LEVEL SECURITY;
ALTER TABLE tire_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tires by org" ON vehicle_tires;
CREATE POLICY "Tires by org" ON vehicle_tires
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Tire photos by tire org" ON tire_photos;
CREATE POLICY "Tire photos by tire org" ON tire_photos
  FOR ALL USING (
    tire_id IN (SELECT id FROM vehicle_tires WHERE org_id = public.current_org_id())
  )
  WITH CHECK (
    tire_id IN (SELECT id FROM vehicle_tires WHERE org_id = public.current_org_id())
  );

CREATE INDEX IF NOT EXISTS idx_tires_vehicle ON vehicle_tires(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tires_current
  ON vehicle_tires(vehicle_id, is_current)
  WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_tires_org ON vehicle_tires(org_id);
CREATE INDEX IF NOT EXISTS idx_tire_photos_tire ON tire_photos(tire_id);

-- Bucket für Reifen-Fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tire-photos', 'tire-photos', false)
ON CONFLICT (id) DO NOTHING;
