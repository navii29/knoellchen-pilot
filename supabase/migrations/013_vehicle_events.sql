-- ============================================
-- KNÖLLCHEN-PILOT — Migration 013
-- Fahrzeughistorie: Service, Reifenwechsel, TÜV/HU, Reparaturen,
-- Versicherungs-Wechsel und sonstige Ereignisse je Fahrzeug.
-- Belege werden im privaten Bucket `vehicle-documents` abgelegt.
-- ============================================

CREATE TABLE IF NOT EXISTS vehicle_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,

  type TEXT NOT NULL CHECK (type IN (
    'service', 'tires', 'tuev', 'repair', 'insurance', 'other'
  )),
  date DATE NOT NULL,
  km_at_event INTEGER,
  description TEXT,
  cost DECIMAL(10, 2),
  next_due_date DATE,
  next_due_km INTEGER,
  provider TEXT,
  document_path TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE vehicle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vehicle events by org" ON vehicle_events;
CREATE POLICY "Vehicle events by org" ON vehicle_events
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_vehicle_events_vehicle ON vehicle_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_events_org     ON vehicle_events(org_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_events_due     ON vehicle_events(org_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_events_type    ON vehicle_events(vehicle_id, type, date DESC);

-- Privater Bucket für Belege/Rechnungen
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-documents', 'vehicle-documents', false)
ON CONFLICT (id) DO NOTHING;
