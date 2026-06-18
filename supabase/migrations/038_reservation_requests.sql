-- ============================================
-- KNÖLLCHEN-PILOT — Migration 038
-- Reservierungs-Anfragen aus dem Portal (vom Betreiber zu bestätigen/in einen
-- Vertrag zu wandeln).
-- ============================================

CREATE TABLE IF NOT EXISTS reservation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_wish TEXT,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'angefragt',   -- angefragt | bestaetigt | abgelehnt
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservation_requests_org ON reservation_requests(org_id);

ALTER TABLE reservation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reservations by org" ON reservation_requests;
CREATE POLICY "Reservations by org" ON reservation_requests
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "portal own reservations" ON reservation_requests;
CREATE POLICY "portal own reservations" ON reservation_requests
  FOR SELECT USING (
    customer_id = public.portal_customer_id() AND org_id = public.portal_org_id()
  );
