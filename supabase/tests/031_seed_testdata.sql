-- ════════════════════════════════════════════════════════════════
-- Testdaten für den Portal-RLS-Test (031).
-- Legt in der bestehenden (ältesten) Organisation zwei Kunden (A, B) und
-- einen Vertrag für Kunde A an. Im Supabase SQL-Editor einfügen → "Run".
-- Danach 031_portal_rls.sql laufen lassen.
-- Nur EINMAL ausführen nötig. Aufräumen: siehe unten.
-- ════════════════════════════════════════════════════════════════
WITH org AS (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
),
a AS (
  INSERT INTO customers (org_id, first_name, last_name, email)
  SELECT id, 'Test-A', 'RLS-Test Mieter A', 'rls-test-a@example.com' FROM org
  RETURNING id, org_id
),
b AS (
  INSERT INTO customers (org_id, first_name, last_name, email)
  SELECT id, 'Test-B', 'RLS-Test Mieter B', 'rls-test-b@example.com' FROM org
  RETURNING id
),
ct AS (
  INSERT INTO contracts (
    org_id, customer_id, contract_nr, plate, renter_name,
    pickup_date, return_date, status
  )
  SELECT a.org_id, a.id,
         'TEST-RLS-' || substr(gen_random_uuid()::text, 1, 8),
         'M-TEST 1', 'RLS-Test Mieter A',
         current_date - 2, current_date + 5, 'aktiv'
  FROM a
  RETURNING id
)
SELECT
  (SELECT id FROM a)  AS kunde_a,
  (SELECT id FROM b)  AS kunde_b,
  (SELECT id FROM ct) AS vertrag_a;

-- ── Aufräumen (Testdaten wieder löschen), wenn du fertig bist: ──
-- DELETE FROM contracts WHERE contract_nr LIKE 'TEST-RLS-%';
-- DELETE FROM customers WHERE email IN ('rls-test-a@example.com','rls-test-b@example.com');
