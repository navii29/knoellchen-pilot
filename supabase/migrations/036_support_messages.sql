-- ============================================
-- KNÖLLCHEN-PILOT — Migration 036
-- Portal-Supportnachrichten (Hilfe → Nachricht an die Vermietung).
-- ============================================

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offen',   -- offen | beantwortet | geschlossen
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_org ON support_messages(org_id);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support by org" ON support_messages;
CREATE POLICY "Support by org" ON support_messages
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());

DROP POLICY IF EXISTS "portal own support" ON support_messages;
CREATE POLICY "portal own support" ON support_messages
  FOR SELECT USING (
    customer_id = public.portal_customer_id() AND org_id = public.portal_org_id()
  );
