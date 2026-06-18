-- ════════════════════════════════════════════════════════════════
-- Portal-RLS-Isolationstest (Migration 031)
-- Beweist: ein eingeloggter Portal-Kunde sieht in der DB NUR seine eigenen Daten.
--
-- Anwendung: Supabase Dashboard → SQL Editor → dieses Skript einfügen → "Run".
-- Keine UUIDs eintragen — das Skript sucht sich automatisch zwei bestehende
-- Kunden (A, B) derselben Organisation + einen Vertrag von A.
--
-- Hinweis: Der SQL-Editor zeigt nur das Ergebnis der LETZTEN ergebnis-liefernden
-- Anweisung. Daher ist die Prüfung (Schritt 4) bewusst die letzte SELECT-Abfrage;
-- das Aufräumen danach liefert kein Ergebnis und überschreibt sie nicht.
--
-- Voraussetzung: Migration 031 ist angewendet und es gibt >=2 Kunden in einer
-- Org mit mindestens einem Vertrag (sonst 031_seed_testdata.sql ausführen).
-- ════════════════════════════════════════════════════════════════

-- 1) Testdaten als Superuser ermitteln (RLS hier umgangen) und in Session-Variablen ablegen.
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
    RAISE EXCEPTION 'Keine Testdaten gefunden: 031_seed_testdata.sql ausführen.';
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

-- 4) PRÜFUNG (letzte sichtbare Ausgabe). Erwartete Werte als Kommentar:
SELECT
  current_user AS lief_als_rolle,                                                                  -- MUSS: authenticated
  (SELECT count(*) FROM contracts WHERE id = current_setting('test.a_contract')::uuid) AS a_sieht_eigenen_vertrag, -- 1
  (SELECT count(*) FROM customers WHERE id = current_setting('test.b_customer')::uuid)  AS a_sieht_kunde_b,         -- 0  ← entscheidend
  (SELECT count(*) FROM customers WHERE id = current_setting('test.a_customer')::uuid)  AS a_sieht_sich_selbst;     -- 1

-- 5) Aufräumen (liefert kein Ergebnis → überschreibt die Prüfung NICHT):
RESET ROLE;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claims', NULL, false);
END $$;
