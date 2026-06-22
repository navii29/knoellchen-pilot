-- ============================================
-- KNÖLLCHEN-PILOT — Migration 048
-- Mitarbeiter-Aktivität (nur für das Inhaber-Überwachungs-Dashboard):
--  - user_activity_daily: akkumulierte aktive Zeit pro Tag (Heartbeat ~60s)
--  - user_activity_log:   Protokoll der Schlüssel-Aktionen (was hat wer getan)
-- ============================================

CREATE TABLE IF NOT EXISTS user_activity_daily (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  active_seconds INTEGER NOT NULL DEFAULT 0, -- akkumulierte aktive Zeit (aus Heartbeats)
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_path TEXT, -- zuletzt gesehene Seite (für "macht gerade")
  PRIMARY KEY (user_id, day)
);
CREATE INDEX IF NOT EXISTS idx_user_activity_daily_org ON user_activity_daily(org_id, day);

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- z.B. 'contract.create', 'contract.activate', 'vehicle.create'
  detail TEXT,          -- z.B. Vertrags-Nr / Kennzeichen
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_org ON user_activity_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user ON user_activity_log(user_id, created_at DESC);

ALTER TABLE user_activity_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Über den anon-Client sieht/schreibt jeder NUR seine EIGENEN Aktivitätszeilen.
-- Das org-weite Überwachungs-Dashboard läuft serverseitig über den Admin-Client
-- (umgeht RLS) und ist zusätzlich per requireOwnerPage auf Inhaber beschränkt.
-- So kann ein Mitarbeiter nicht per direktem Query die Kollegen ausspähen.
DROP POLICY IF EXISTS "activity_daily_by_org" ON user_activity_daily;
DROP POLICY IF EXISTS "activity_daily_self" ON user_activity_daily;
CREATE POLICY "activity_daily_self" ON user_activity_daily
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_log_by_org" ON user_activity_log;
DROP POLICY IF EXISTS "activity_log_self" ON user_activity_log;
CREATE POLICY "activity_log_self" ON user_activity_log
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
