-- ============================================
-- KNÖLLCHEN-PILOT — Migration 037
-- In-Portal-Benachrichtigungen (Erinnerungen, Status-Updates). Kein E-Mail-
-- Versand — rein im Portal sichtbar.
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  type TEXT NOT NULL,            -- return_due | sign | ticket | checkin | extension | info
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(customer_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notifications by org" ON notifications;
CREATE POLICY "Notifications by org" ON notifications
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

-- Portal: eigene Benachrichtigungen lesen + als gelesen markieren (read_at).
DROP POLICY IF EXISTS "portal own notifications read" ON notifications;
CREATE POLICY "portal own notifications read" ON notifications
  FOR SELECT USING (
    customer_id = public.portal_customer_id() AND org_id = public.portal_org_id()
  );
DROP POLICY IF EXISTS "portal own notifications upd" ON notifications;
CREATE POLICY "portal own notifications upd" ON notifications
  FOR UPDATE USING (
    customer_id = public.portal_customer_id() AND org_id = public.portal_org_id()
  ) WITH CHECK (
    customer_id = public.portal_customer_id() AND org_id = public.portal_org_id()
  );
