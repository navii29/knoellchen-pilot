-- ════════════════════════════════════════════════════════════════
-- 033 — Multi-User / Team
--   Bisher: 1 Firma = 1 Login (RLS "Users see self" verhinderte einen
--   zweiten effektiven Nutzer pro Org).
--   Jetzt: mehrere Mitarbeiter pro Org mit eigenem Login + Rollen.
-- ════════════════════════════════════════════════════════════════

-- E-Mail im Profil denormalisieren (für die Mitgliederliste, ohne pro
-- Mitglied auth.users abfragen zu müssen). Backfill aus auth.users.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
UPDATE users u
   SET email = a.email
  FROM auth.users a
 WHERE a.id = u.id AND (u.email IS NULL OR u.email = '');

-- RLS: Mitglieder einer Org sehen sich gegenseitig (Team-Liste).
-- Schreibzugriff (anlegen/Rolle ändern/entfernen) läuft ausschließlich über
-- die Admin-API mit Owner-Prüfung — so kann sich kein Mitglied selbst zum
-- Owner machen. current_org_id() ist SECURITY DEFINER → keine Rekursion.
DROP POLICY IF EXISTS "Users see self" ON users;
DROP POLICY IF EXISTS "Users select own org" ON users;
CREATE POLICY "Users select own org" ON users
  FOR SELECT USING (org_id = public.current_org_id());
