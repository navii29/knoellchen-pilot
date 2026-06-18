-- Portal RLS isolation test (run in the Supabase SQL editor).
-- Simulates a portal JWT by setting request.jwt.claims, then asserts a
-- customer can read their own rows but NOT another customer's.
--
-- Requires two seeded customers in the same project:
--   A: A_CUSTOMER_ID / A_ORG_ID, owns contract A_CONTRACT_ID
--   B: B_CUSTOMER_ID (different customer)
-- Replace the UUID placeholders with real seed values before running.

-- ── As customer A ──────────────────────────────────────────────
SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object(
    'role','authenticated',
    'customer_id','A_CUSTOMER_ID',
    'org_id','A_ORG_ID'
  )::text,
  true
);

-- EXPECT: a_sees_own = 1  (A reads its own contract)
SELECT count(*) AS a_sees_own FROM contracts WHERE id = 'A_CONTRACT_ID';

-- EXPECT: a_sees_b = 0     (A must NOT see B's customer row)
SELECT count(*) AS a_sees_b FROM customers WHERE id = 'B_CUSTOMER_ID';

-- EXPECT: a_sees_self = 1  (A reads its own customer row)
SELECT count(*) AS a_sees_self FROM customers WHERE id = 'A_CUSTOMER_ID';

RESET ROLE;
SELECT set_config('request.jwt.claims', NULL, true);

-- ── Sanity: no claims ⇒ portal helpers return NULL ⇒ no portal rows ──
-- EXPECT: nobody = 0
SET ROLE authenticated;
SELECT count(*) AS nobody FROM contracts WHERE id = 'A_CONTRACT_ID';
RESET ROLE;
