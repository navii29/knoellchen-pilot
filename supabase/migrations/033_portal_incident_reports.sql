-- ============================================
-- KNÖLLCHEN-PILOT — Migration 033
-- Portal: Kunde darf während der Miete Schäden selbst melden (nutzt die
-- bestehende damage_reports-Tabelle + den damage-photos-Bucket aus 007).
-- Das Anlegen läuft serverseitig über den Admin-Client mit Ownership-Check;
-- hier nur die SELECT-Policy, damit der Kunde seine eigenen Meldungen sieht.
-- ============================================

DROP POLICY IF EXISTS "portal own damage reports" ON damage_reports;
CREATE POLICY "portal own damage reports" ON damage_reports
  FOR SELECT USING (
    org_id = public.portal_org_id()
    AND contract_id IN (
      SELECT id FROM contracts WHERE customer_id = public.portal_customer_id()
    )
  );
