-- ============================================
-- KNÖLLCHEN-PILOT — Supabase Schema
-- Paste into Supabase → SQL Editor → Run
-- ============================================

-- Tables ------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  street TEXT,
  zip TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  tax_number TEXT,
  processing_fee DECIMAL(10,2) DEFAULT 25.00,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  plate TEXT NOT NULL,
  vehicle_type TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, plate)
);

-- Legacy: bookings (wird durch contracts ersetzt — bleibt für Migration bestehen)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  plate TEXT NOT NULL,
  renter_name TEXT NOT NULL,
  renter_email TEXT,
  renter_address TEXT,
  renter_birthday TEXT,
  renter_phone TEXT,
  renter_license TEXT,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  ticket_nr TEXT NOT NULL,
  status TEXT DEFAULT 'neu',
  plate TEXT,
  vehicle_type TEXT,
  offense TEXT,
  offense_details TEXT,
  location TEXT,
  offense_date DATE,
  offense_time TEXT,
  authority TEXT,
  reference_nr TEXT,
  fine_amount DECIMAL(10,2),
  points INTEGER DEFAULT 0,
  deadline DATE,
  ai_confidence DECIMAL(3,2),
  ai_raw_response JSONB,
  booking_id UUID REFERENCES bookings(id),
  contract_id UUID REFERENCES contracts(id),
  renter_name TEXT,
  renter_email TEXT,
  processing_fee DECIMAL(10,2) DEFAULT 25.00,
  paid BOOLEAN DEFAULT false,
  reminder_level INTEGER DEFAULT 0,
  upload_path TEXT,
  letter_path TEXT,
  invoice_path TEXT,
  questionnaire_path TEXT,
  letter_sent BOOLEAN DEFAULT false,
  authority_sent BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'upload',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS ---------------------------------------------------

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_logs ENABLE ROW LEVEL SECURITY;

-- Helper to avoid recursive policy on users table.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT org_id FROM public.users WHERE id = auth.uid() $$;

DROP POLICY IF EXISTS "Users see self" ON users;
CREATE POLICY "Users see self" ON users
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Org members see org" ON organizations;
CREATE POLICY "Org members see org" ON organizations
  FOR ALL USING (id = public.current_org_id()) WITH CHECK (id = public.current_org_id());

DROP POLICY IF EXISTS "Vehicles by org" ON vehicles;
CREATE POLICY "Vehicles by org" ON vehicles
  FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Bookings by org" ON bookings;
CREATE POLICY "Bookings by org" ON bookings
  FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Contracts by org" ON contracts;
CREATE POLICY "Contracts by org" ON contracts
  FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Tickets by org" ON tickets;
CREATE POLICY "Tickets by org" ON tickets
  FOR ALL USING (org_id = public.current_org_id()) WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "Logs by ticket org" ON ticket_logs;
CREATE POLICY "Logs by ticket org" ON ticket_logs
  FOR ALL USING (
    ticket_id IN (SELECT id FROM tickets WHERE org_id = public.current_org_id())
  );

-- Indexes -----------------------------------------------

CREATE INDEX IF NOT EXISTS idx_tickets_org      ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created  ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_lookup  ON bookings(org_id, plate, pickup_date, return_date);
CREATE INDEX IF NOT EXISTS idx_contracts_lookup ON contracts(org_id, plate, pickup_date, return_date);
CREATE INDEX IF NOT EXISTS idx_contracts_org    ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_tickets_contract ON tickets(contract_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate   ON vehicles(org_id, plate);
CREATE INDEX IF NOT EXISTS idx_logs_ticket      ON ticket_logs(ticket_id, created_at DESC);

-- Storage buckets --------------------------------------
-- Run once. Both buckets are private — files are accessed via signed URLs only.

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-uploads', 'ticket-uploads', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-docs', 'generated-docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-uploads', 'contract-uploads', false)
ON CONFLICT (id) DO NOTHING;
