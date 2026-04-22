-- ============================================
-- KNÖLLCHEN-PILOT — Migration 001
-- Contracts werden zur zentralen Quelle für Mieterdaten.
-- Nach dem Einspielen ersetzen Verträge die alten "Buchungen".
-- ============================================

CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  contract_nr TEXT NOT NULL,

  vehicle_id UUID REFERENCES vehicles(id),
  plate TEXT NOT NULL,
  vehicle_type TEXT,

  renter_name TEXT NOT NULL,
  renter_email TEXT,
  renter_phone TEXT,
  renter_address TEXT,
  renter_birthday TEXT,
  renter_license_nr TEXT,
  renter_license_class TEXT,
  renter_license_expiry TEXT,

  pickup_date DATE NOT NULL,
  pickup_time TEXT,
  return_date DATE NOT NULL,
  return_time TEXT,
  actual_return_date DATE,

  daily_rate DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  deposit DECIMAL(10,2),

  km_pickup INTEGER,
  km_return INTEGER,

  status TEXT DEFAULT 'aktiv',

  contract_pdf_path TEXT,
  pickup_photos JSONB DEFAULT '[]',
  return_photos JSONB DEFAULT '[]',

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(org_id, contract_nr)
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Contracts by org" ON contracts;
CREATE POLICY "Contracts by org" ON contracts
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_contracts_lookup ON contracts(org_id, plate, pickup_date, return_date);
CREATE INDEX IF NOT EXISTS idx_contracts_org    ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- Strafzettel mit Vertrag verknüpfen
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id);
CREATE INDEX IF NOT EXISTS idx_tickets_contract ON tickets(contract_id);

-- Storage-Bucket für hochgeladene Verträge
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-uploads', 'contract-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Bestehende bookings als Contracts übernehmen (einmalig).
-- Falls keine bookings existieren, ist das ein No-Op.
INSERT INTO contracts (
  org_id, contract_nr, plate, renter_name, renter_email,
  renter_phone, renter_address, renter_birthday, renter_license_nr,
  pickup_date, return_date, status, created_at
)
SELECT
  b.org_id,
  'MV-MIG-' || substring(b.id::text, 1, 8),
  b.plate,
  b.renter_name,
  b.renter_email,
  b.renter_phone,
  b.renter_address,
  b.renter_birthday,
  b.renter_license,
  b.pickup_date,
  b.return_date,
  'aktiv',
  b.created_at
FROM bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM contracts c
  WHERE c.org_id = b.org_id
    AND c.plate = b.plate
    AND c.pickup_date = b.pickup_date
    AND c.renter_name = b.renter_name
);

-- Bestehende Tickets mit booking_id auf das migrierte Contract zeigen lassen
UPDATE tickets t
SET contract_id = c.id
FROM bookings b
JOIN contracts c
  ON c.org_id = b.org_id
 AND c.plate = b.plate
 AND c.pickup_date = b.pickup_date
 AND c.renter_name = b.renter_name
WHERE t.booking_id = b.id
  AND t.contract_id IS NULL;
