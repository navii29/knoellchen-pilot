-- ============================================
-- KNÖLLCHEN-PILOT — Migration 067
-- Operator-seitige Benachrichtigungen (eigene Tabelle, getrennt von der
-- mieterseitigen notifications-Tabelle 037). Adressiert eine ORGANISATION
-- (nicht einen Kunden). Dieser Schritt baut nur den Datenweg (Schreiben);
-- Glocke/Liste/Mark-Read folgen separat.
-- read_at ist org-weit (ein Operator markiert gelesen → für die Org gelesen);
-- eine per-Operator-Variante (user_id) ist bewusst NICHT Teil dieses Schritts.
-- ============================================

CREATE TABLE IF NOT EXISTS operator_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) NOT NULL,   -- Mandanten-Grenze (Pflicht)
  type TEXT NOT NULL,            -- extension_request | ...
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  -- Bezug zur Quelle (nullable, für spätere Verlinkung/Aufräumen):
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  extension_id UUID REFERENCES contract_extensions(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_org
  ON operator_notifications(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_notifications_unread
  ON operator_notifications(org_id) WHERE read_at IS NULL;

ALTER TABLE operator_notifications ENABLE ROW LEVEL SECURITY;

-- Org-scoped, identisches Muster wie notifications (037) / contract_extensions
-- (034): Operatoren sehen/ändern NUR Zeilen ihrer eigenen org_id. Keine Portal-
-- Policy — die Tabelle ist rein operator-seitig.
DROP POLICY IF EXISTS "Operator notifications by org" ON operator_notifications;
CREATE POLICY "Operator notifications by org" ON operator_notifications
  FOR ALL USING (org_id = public.current_org_id())
         WITH CHECK (org_id = public.current_org_id());
