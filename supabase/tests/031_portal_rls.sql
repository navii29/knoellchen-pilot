-- ════════════════════════════════════════════════════════════════
-- Portal-RLS-Isolationstest (Migration 031)
-- Beweist: ein eingeloggter Portal-Kunde sieht in der DB NUR seine eigenen Daten.
--
-- Anwendung: Supabase Dashboard → SQL Editor → dieses Skript einfügen → "Run".
-- Es müssen KEINE UUIDs von Hand eingetragen werden — das Skript sucht sich
-- automatisch zwei bestehende Kunden (A, B) derselben Organisation + einen
-- Vertrag von A aus deinen echten Daten.
--
-- Voraussetzung: Migration 031 ist angewendet, und es gibt >=2 Kunden in einer
-- Org, von denen einer mindestens einen Vertrag hat.
-- ════════════════════════════════════════════════════════════════

-- 1) Testdaten als Superuser ermitteln (hier wird RLS umgangen) und in
--    Session-Variablen ablegen.
SELECT
  set_config('test.a_customer', a_customer::text, false),
  set_config('test.a_org',      a_org::text,      false),
  set_config('test.a_contract', a_contract::text, false),
  set_config('test.b_customer', b_customer::text, false)
FROM (
  SELECT c.id AS a_customer, c.org_id AS a_org, ct.id AS a_contract, b.id AS b_customer
  FROM contracts ct
  JOIN customers c ON c.id = ct.customer_id
  JOIN LATERAL (
    SELECT id FROM customers x
    WHERE x.org_id = c.org_id AND x.id <> c.id
    LIMIT 1
  ) b ON true
  LIMIT 1
) fx;

-- Klare Meldung, falls keine passenden Testdaten existieren:
DO $$
BEGIN
  IF current_setting('test.a_contract', true) IS NULL THEN
    RAISE EXCEPTION 'Keine Testdaten gefunden: brauche >=2 Kunden in derselben Org und mind. 1 Vertrag.';
  END IF;
END $$;

-- 2) So tun, als wäre Kunde A im Portal eingeloggt (JWT-Claims setzen):
SELECT set_config('request.jwt.claims',
  json_build_object(
    'role','authenticated',
    'customer_id', current_setting('test.a_customer'),
    'org_id',      current_setting('test.a_org'))::text,
  false);

-- 3) In die Portal-Rolle wechseln → AB JETZT greift RLS:
SET ROLE authenticated;

-- 4) Das Ergebnis. Erwartete Werte stehen als Kommentar daneben:
SELECT
  (SELECT count(*) FROM contracts WHERE id = current_setting('test.a_contract')::uuid) AS a_sieht_eigenen_vertrag, -- erwartet: 1
  (SELECT count(*) FROM customers WHERE id = current_setting('test.b_customer')::uuid)  AS a_sieht_kunde_b,         -- erwartet: 0  ← der entscheidende
  (SELECT count(*) FROM customers WHERE id = current_setting('test.a_customer')::uuid)  AS a_sieht_sich_selbst;     -- erwartet: 1

-- 5) Aufräumen:
RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, false);
