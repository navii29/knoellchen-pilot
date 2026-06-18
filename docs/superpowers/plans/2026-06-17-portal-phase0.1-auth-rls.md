# Portal Phase 0.1 — Auth/Session Rebuild + RLS Isolation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the portal's non-revocable, app-level-only auth with a revocable, **DB-enforced (RLS)** session system, so a logged-in renter can only ever read/write their own rows — enforced by Postgres, not by remembering query filters.

**Architecture:** Portal JWTs are re-signed with the **Supabase JWT secret** and carry `role:authenticated` + claims `customer_id`/`org_id`/`session_id`. Portal DB access moves from the service-role (RLS-bypassing) client to an **anon client that sends the portal JWT as its bearer**, so additive **portal RLS policies** (keyed to `portal_customer_id()`/`portal_org_id()` claim helpers) gate every row. A new `portal_sessions` table backs **revocation + logout-everywhere**. Operators (Supabase-Auth, `current_org_id()`) are unaffected — portal policies are additive/permissive.

**Tech Stack:** Next.js 14 App Router · Supabase (Postgres + RLS + Storage) · `jose` (JWT) · `bcryptjs` · `vitest` (new).

**Spec:** `docs/superpowers/specs/2026-06-17-customer-portal-redesign-design.md` (§7.1 Auth, §7.2 RLS, §8 Data model). This plan implements the §7.1/§7.2 slice of Phase 0.

**Branch:** `feat/customer-portal-rebuild`. **Migration number:** next is `031`.

---

## Ground truth (verified 2026-06-17, this branch)

- `src/lib/portal-auth.ts`: HS256 JWT via `PORTAL_JWT_SECRET`, 30-day TTL, payload `{customer_id, org_id, email}`. `getPortalSession()` only verifies the JWT (no session-row check). `getPortalCustomer()` uses the **service-role** admin client. `createMagicToken()` is now **dead** (magic-link route was deleted in `35c6da0`) and will be removed.
- `src/lib/supabase/server.ts`: `createClient()` (anon, cookie-bound, operators), `createAdminClient()` (service-role), `requireUser()` (operators).
- `src/app/api/portal/login/route.ts`: password login via admin client; sets `kp_portal` cookie with a 30-day token.
- `supabase/migrations/018_customer_portal.sql`: `customer_logins(id, customer_id, org_id, email, password_hash, magic_token, magic_token_expires, last_login, active, UNIQUE(org_id,email))`; RLS keyed to `public.current_org_id()` (operator context). Bucket `portal-uploads`.
- `supabase-schema.sql:148`: `public.current_org_id()` is the operator RLS helper. Existing portal-readable tables (`customers`, `contracts`, `tickets`) already have **operator** policies `USING (org_id = current_org_id())`.
- **No test runner** exists on this branch. `tsx@^4.21.0` is present.
- Portal routes that currently use the **service-role** admin client and will be migrated to the RLS-bearing client: `src/app/api/portal/me/route.ts`, `src/app/api/portal/profile/route.ts`, `src/app/api/portal/contracts/route.ts`, `src/app/api/portal/contracts/[id]/**`, `src/app/api/portal/tickets/**`, `src/app/api/portal/documents/route.ts`, plus `getPortalCustomer()` in `portal-auth.ts` and `loadPortalContract()` in `src/lib/portal-contract-guard.ts`.

---

## File structure (created / modified)

- Create `vitest.config.ts` — test runner config.
- Create `supabase/migrations/031_portal_sessions_rls.sql` — `portal_sessions` table, claim helpers, additive portal RLS policies, storage policy.
- Modify `src/lib/portal-auth.ts` — re-architect JWT (Supabase secret + claims + `session_id`), access/refresh, `portal_sessions` CRUD, revocation, `getPortalSession()` session-row check, remove dead magic-token code.
- Create `src/lib/portal-auth.test.ts` — unit tests for sign/verify/session lifecycle.
- Modify `src/lib/supabase/server.ts` — add `createPortalClient(accessToken)` (anon key + JWT bearer).
- Modify `src/app/api/portal/login/route.ts` — create a `portal_sessions` row, issue access+refresh cookies.
- Create `src/app/api/portal/logout/route.ts` and `src/app/api/portal/logout-all/route.ts` — revoke one / all sessions.
- Create `src/app/api/portal/session/refresh/route.ts` — rotate access token from refresh.
- Create `src/app/api/portal/password/route.ts` — in-session password change.
- Modify the portal feature routes + `getPortalCustomer`/`loadPortalContract` — swap admin client → `createPortalClient`, keep `.eq` filters as defense-in-depth.
- Create `supabase/tests/031_portal_rls.sql` — pgTAP-free SQL isolation test (two customers).
- Modify `.env.local.example` — add `SUPABASE_JWT_SECRET`.
- Modify `package.json` — add `vitest` devDep + `test` scripts.

---

## Chunk 1: Test harness + env

### Task 1: Add vitest

**Files:** Modify `package.json`; Create `vitest.config.ts`.

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest@^2`
Expected: `vitest` appears in `devDependencies`.

- [ ] **Step 2: Add test scripts to `package.json`**

In `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 4: Smoke test** — create `src/lib/__smoke.test.ts` with `import {expect,test} from "vitest"; test("smoke",()=>expect(1).toBe(1));`

Run: `npm test`
Expected: 1 passed. Then delete `src/lib/__smoke.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest runner"
```

### Task 2: Add `SUPABASE_JWT_SECRET` to env example

**Files:** Modify `.env.local.example`.

- [ ] **Step 1:** Under the Supabase block, add:
```
# Supabase LEGACY JWT secret — Dashboard → Settings → JWT Keys → "Legacy JWT
# Secret" (Reveal). The HS256 symmetric secret PostgREST still uses to verify
# JWTs; portal JWTs are signed with it so Postgres RLS can read their claims.
# NOT the new asymmetric "JWT Signing Keys".
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "chore(env): document SUPABASE_JWT_SECRET for portal RLS"
```

> **Operator action (outside the plan):** set `SUPABASE_JWT_SECRET` = the **Legacy JWT Secret** (Dashboard → Settings → JWT Keys → "Legacy JWT secret (still used)" → Reveal) in `.env.local` and Vercel env (Preview + Production). It's the existing project secret — no new account needed.
>
> **Risk — legacy secret lifetime:** this approach relies on the project's **legacy HS256 JWT secret remaining active for verification**. Do NOT "switch to publishable/secret API keys to disable" the legacy `anon`/`service_role` keys, and do not rotate/revoke the legacy secret, while the portal depends on it. If it is ever disabled, HS256 portal tokens stop verifying and `signAccessToken` must move to the new **asymmetric JWT Signing Key** (ES256/RS256 via `jose` with the private key). Mitigation: keep `signAccessToken` the single signing chokepoint so the swap is one function.
>
> **Do not change** the dashboard "Access token expiry time" (3600s) — that governs Supabase-Auth/operator tokens; the portal access-token TTL is set independently in `signAccessToken` (15m).

---

## Chunk 2: DB migration — portal_sessions, claim helpers, RLS policies

### Task 3: Write migration `031_portal_sessions_rls.sql`

**Files:** Create `supabase/migrations/031_portal_sessions_rls.sql`.

- [ ] **Step 1: Write the migration**

```sql
-- ============================================
-- KNÖLLCHEN-PILOT — Migration 031
-- Portal-Sessions (Revocation / Logout-everywhere) + DB-enforced RLS
-- für das Kundenportal. Portal-JWTs tragen role=authenticated + Claims
-- customer_id/org_id/session_id; diese Policies sind ADDITIV zu den
-- bestehenden Operator-Policies (current_org_id()).
-- ============================================

-- 1) Session-Tabelle (eine Zeile pro Login/Gerät; Refresh-Token gehasht)
CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  login_id UUID REFERENCES customer_logins(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) NOT NULL,
  refresh_hash TEXT NOT NULL,            -- sha256(refresh token)
  user_agent TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,       -- refresh expiry (e.g. 30d)
  revoked_at TIMESTAMPTZ                 -- non-null ⇒ dead
);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_customer ON portal_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_refresh ON portal_sessions(refresh_hash);

-- 2) Claim-Helper (lesen die JWT-Claims des Portal-Tokens)
CREATE OR REPLACE FUNCTION public.portal_customer_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'customer_id','')::uuid
$$;
CREATE OR REPLACE FUNCTION public.portal_org_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'org_id','')::uuid
$$;

-- 3) RLS auf portal_sessions
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portal own sessions" ON portal_sessions;
CREATE POLICY "portal own sessions" ON portal_sessions
  FOR SELECT USING (customer_id = public.portal_customer_id());

-- 4) ADDITIVE Portal-Policies auf bestehende Tabellen
--    (permissiv ⇒ OR mit den Operator-Policies; Operatoren bleiben unberührt)
DROP POLICY IF EXISTS "portal self customer" ON customers;
CREATE POLICY "portal self customer" ON customers
  FOR SELECT USING (id = public.portal_customer_id() AND org_id = public.portal_org_id());
DROP POLICY IF EXISTS "portal self customer upd" ON customers;
CREATE POLICY "portal self customer upd" ON customers
  FOR UPDATE USING (id = public.portal_customer_id() AND org_id = public.portal_org_id())
            WITH CHECK (id = public.portal_customer_id() AND org_id = public.portal_org_id());

DROP POLICY IF EXISTS "portal own contracts" ON contracts;
CREATE POLICY "portal own contracts" ON contracts
  FOR SELECT USING (customer_id = public.portal_customer_id() AND org_id = public.portal_org_id());

DROP POLICY IF EXISTS "portal own tickets" ON tickets;
CREATE POLICY "portal own tickets" ON tickets
  FOR SELECT USING (
    org_id = public.portal_org_id()
    AND contract_id IN (SELECT id FROM contracts WHERE customer_id = public.portal_customer_id())
  );

-- 5) Storage: Portal darf nur eigene Objekte im Bucket 'portal-uploads' lesen
--    (Pfad-Konvention org_id/customer_id/...)
DROP POLICY IF EXISTS "portal own uploads read" ON storage.objects;
CREATE POLICY "portal own uploads read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'portal-uploads'
    AND (storage.foldername(name))[1] = public.portal_org_id()::text
    AND (storage.foldername(name))[2] = public.portal_customer_id()::text
  );
```

- [ ] **Step 2: Apply the migration** (Supabase SQL editor, or `supabase db push` if the CLI is wired)

Expected: no errors; `portal_sessions` exists; `select public.portal_customer_id();` returns `NULL` when no JWT claims are set. Note: creating a policy on `storage.objects` needs sufficient privileges — the Supabase SQL editor works; if `supabase db push` errors on the storage policy under a restricted role, run that statement in the SQL editor.

- [ ] **Step 2b: Verify the storage path convention** — grep the existing code that writes into the `portal-uploads` bucket and confirm objects are keyed as `org_id/customer_id/...` (the two segments the read policy checks). If writes use a different prefix, align either the policy or the write paths **before** relying on portal reads — this is the same class of bug as the `generated-docs` / `ticket-documents` mismatch (spec §2).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/031_portal_sessions_rls.sql
git commit -m "feat(db): portal_sessions + additive portal RLS policies (031)"
```

### Task 4: SQL isolation test (two customers)

**Files:** Create `supabase/tests/031_portal_rls.sql`.

- [ ] **Step 1: Write the test script** — simulates two portal JWTs by setting `request.jwt.claims` and asserts cross-customer reads return zero rows.

```sql
-- Run in the Supabase SQL editor against seed data with two customers
-- (A_CUSTOMER_ID/A_ORG_ID own contract A_CONTRACT_ID; B_CUSTOMER_ID different).
-- Replace the UUIDs with real seed values.

-- As customer A:
SET ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('role','authenticated',
    'customer_id','A_CUSTOMER_ID','org_id','A_ORG_ID')::text, true);

-- EXPECT: 1 row (A's own contract)
SELECT count(*) AS a_sees_own FROM contracts WHERE id = 'A_CONTRACT_ID';
-- EXPECT: 0 rows (A must NOT see B's customer row)
SELECT count(*) AS a_sees_b FROM customers WHERE id = 'B_CUSTOMER_ID';

RESET ROLE;
```

- [ ] **Step 2: Run it** in the SQL editor against seed data.
Expected: `a_sees_own = 1`, `a_sees_b = 0`. Document the result in the PR.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/031_portal_rls.sql
git commit -m "test(db): portal RLS isolation SQL test (031)"
```

---

## Chunk 3: Auth lib re-architecture

### Task 5: Re-sign portal JWT with the Supabase secret + claims (TDD)

**Files:** Modify `src/lib/portal-auth.ts`; Create `src/lib/portal-auth.test.ts`.

- [ ] **Step 1: Write failing tests** (`src/lib/portal-auth.test.ts`)

```ts
import { beforeAll, expect, test } from "vitest";
import { signAccessToken, verifyAccessToken } from "./portal-auth";

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = "test-secret-at-least-32-chars-long-xxxx";
});

test("access token round-trips with portal claims", async () => {
  const token = await signAccessToken({
    customer_id: "11111111-1111-1111-1111-111111111111",
    org_id: "22222222-2222-2222-2222-222222222222",
    session_id: "33333333-3333-3333-3333-333333333333",
    email: "a@b.de",
  });
  const s = await verifyAccessToken(token);
  expect(s?.customer_id).toBe("11111111-1111-1111-1111-111111111111");
  expect(s?.session_id).toBe("33333333-3333-3333-3333-333333333333");
});

test("token signed with wrong secret fails", async () => {
  const token = await signAccessToken({
    customer_id: "1", org_id: "2", session_id: "3", email: "a@b.de",
  });
  process.env.SUPABASE_JWT_SECRET = "a-totally-different-secret-32-characters";
  expect(await verifyAccessToken(token)).toBeNull();
  process.env.SUPABASE_JWT_SECRET = "test-secret-at-least-32-chars-long-xxxx";
});

test("access token NEVER carries a `sub` claim (RLS safety)", async () => {
  const token = await signAccessToken({
    customer_id: "1", org_id: "2", session_id: "3", email: "a@b.de",
  });
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  expect(claims.sub).toBeUndefined();          // ← auth.uid() must stay NULL
  expect(claims.role).toBe("authenticated");
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npm test -- portal-auth`
Expected: FAIL (`signAccessToken`/`verifyAccessToken` not exported).

- [ ] **Step 3: Implement** in `src/lib/portal-auth.ts` — replace the JWT section. Sign with `SUPABASE_JWT_SECRET`; include `role:"authenticated"`, `aud:"authenticated"`, short TTL.

```ts
const ACCESS_TTL = "15m";
export type PortalClaims = {
  customer_id: string; org_id: string; session_id: string; email: string;
};
const supabaseSecret = () => {
  const s = process.env.SUPABASE_JWT_SECRET;
  if (!s || s.length < 32) throw new Error("SUPABASE_JWT_SECRET fehlt/zu kurz (min 32).");
  return new TextEncoder().encode(s);
};
export const signAccessToken = (c: PortalClaims) =>
  new SignJWT({ ...c, role: "authenticated", aud: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(supabaseSecret());
export const verifyAccessToken = async (t: string): Promise<PortalClaims | null> => {
  try {
    const { payload } = await jwtVerify(t, supabaseSecret(), { audience: "authenticated" });
    const ok = ["customer_id","org_id","session_id","email"].every(k => typeof payload[k] === "string");
    return ok ? {
      customer_id: payload.customer_id as string, org_id: payload.org_id as string,
      session_id: payload.session_id as string, email: payload.email as string,
    } : null;
  } catch { return null; }
};
```

> **Invariant (security-critical):** the portal access JWT MUST NOT set `sub` (and `customer_id`/`org_id` must never be mapped onto `sub`). The whole RLS coexistence relies on `auth.uid()` being NULL for portal tokens so the operator policies (`current_org_id()`) match zero rows; a `sub` would silently grant portal tokens operator-level reads. The Step 1 test asserts `sub` is absent — keep it.

Remove the old `PortalSession`/`signSessionToken`/`verifySessionToken` and the dead `createMagicToken` (magic-link route is gone). Keep `PORTAL_COOKIE`, cookie helpers (now for the access token), `hashPassword`/`verifyPassword`, `checkRateLimit`, `ipFromHeaders`. Add a `REFRESH_COOKIE = "kp_portal_refresh"`.

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- portal-auth`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/portal-auth.ts src/lib/portal-auth.test.ts
git commit -m "feat(portal-auth): sign access JWT with Supabase secret + claims"
```

### Task 6: Session lifecycle helpers (create / verify-active / revoke) (TDD)

**Files:** Modify `src/lib/portal-auth.ts` (+ tests).

- [ ] **Step 1: Write failing tests** for: `createSession(login, {ua,ip})` returns `{access, refresh, session_id}` and inserts a `portal_sessions` row; `getPortalSession()` returns null when the row is `revoked_at`; `revokeSession(session_id)` and `revokeAllForCustomer(customer_id)`. Mock the admin client (inject a fake `createAdminClient`), or extract pure helpers (`hashRefresh`, `randomRefresh`) and unit-test those plus a thin DB wrapper.

```ts
import { hashRefresh, randomRefresh } from "./portal-auth";
test("hashRefresh is deterministic; randomRefresh is 64 hex", () => {
  const r = randomRefresh();
  expect(r).toMatch(/^[a-f0-9]{64}$/);
  expect(hashRefresh(r)).toBe(hashRefresh(r));
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- portal-auth`

- [ ] **Step 3: Implement** `randomRefresh` (`randomBytes(32).hex`), `hashRefresh` (`createHash('sha256')`), `createSession`, `getPortalSession` (verify access JWT **and** confirm the `portal_sessions` row is non-revoked + unexpired), `revokeSession`, `revokeAllForCustomer`. `getPortalSession` returns the `PortalClaims` (now session-row-checked).

> **Client note (important):** `portal_sessions` has only a `FOR SELECT` RLS policy (migration 031) and these helpers run before/around a valid portal JWT exists (login, refresh, revoke). So `createSession`, the session-row check inside `getPortalSession`, the refresh lookup-by-`hashRefresh`, `revokeSession`, and `revokeAllForCustomer` all use **`createAdminClient()`** (the spec §7.2 carve-out for privileged server actions) — NOT `createPortalClient`. Wiring them to the RLS client would make the refresh lookup silently return nothing.

- [ ] **Step 4: Run, verify pass.**

- [ ] **Step 5: Commit** `git commit -am "feat(portal-auth): portal_sessions lifecycle + revocation"`

---

## Chunk 4: RLS-bearing client + route migration

### Task 7: `createPortalClient(accessToken)`

**Files:** Modify `src/lib/supabase/server.ts`.

- [ ] **Step 1: Implement**

```ts
export const createPortalClient = (accessToken: string) =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,   // anon key — RLS applies
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
```

- [ ] **Step 2: Commit** `git commit -am "feat(supabase): RLS-bearing portal client"`

### Task 8: Rewrite login + add logout / logout-all / refresh / password routes

**Files:** Modify `src/app/api/portal/login/route.ts`; Create `logout`, `logout-all`, `session/refresh`, `password` routes.

- [ ] **Step 1:** `login/route.ts` — after `verifyPassword`, call `createSession(login, {ua, ip})`, then set the access cookie (`kp_portal`, 15m) **and** the refresh cookie (`kp_portal_refresh`, httpOnly, 30d). Keep rate-limit.
- [ ] **Step 2:** `logout/route.ts` — `revokeSession(session_id)` from the current access token; clear both cookies.
- [ ] **Step 3:** `logout-all/route.ts` — `revokeAllForCustomer(customer_id)`; clear cookies.
- [ ] **Step 4:** `session/refresh/route.ts` — read refresh cookie, look up the matching non-revoked `portal_sessions` row by `hashRefresh` (**admin client** — see Task 6 client note), rotate (new refresh + new access), update `last_seen`.
- [ ] **Step 5:** `password/route.ts` — requires a valid session; verifies old password, `hashPassword(new)`, updates `customer_logins.password_hash`; optionally `revokeAllForCustomer` except current.
- [ ] **Step 6: Manual verification** — `npm run build`; then log in (cookies set), hit `/api/portal/me`, call logout, confirm `/api/portal/me` now 401s. Document.
- [ ] **Step 7: Commit** `git commit -am "feat(portal): session login/logout/refresh/password on portal_sessions"`

### Task 9: Migrate portal reads to the RLS-bearing client

**Files:** `src/lib/portal-auth.ts` (`getPortalCustomer`), `src/lib/portal-contract-guard.ts` (`loadPortalContract`), and every route under `src/app/api/portal/**` that currently calls `createAdminClient()`.

- [ ] **Step 1:** Add a helper `requirePortal()` returning `{ claims, supa }` where `supa = createPortalClient(accessToken)` (401 if no valid session).
- [ ] **Step 2:** Mechanically replace `createAdminClient()` → the `requirePortal()` client in each portal read route. **Keep** the existing `.eq("customer_id", …)`/`.eq("org_id", …)` filters as defense-in-depth (spec §7.2). Privileged writes that legitimately need service-role (e.g. provisioning) stay on `createAdminClient` with explicit guards — list them in the PR.
- [ ] **Step 3: Verify isolation end-to-end** — with two seeded customers, log in as A and confirm `/api/portal/contracts`, `/api/portal/tickets/[B's id]/file`, `/api/portal/me` cannot reach B's data (expect empty/404), proving RLS (not just filters) enforces it. Document.
- [ ] **Step 4: Commit** `git commit -am "refactor(portal): route reads through RLS-bearing client"`

### Task 10: Cleanup + final checks

- [ ] **Step 1:** Remove now-unused exports (`createMagicToken`, old `signSessionToken`) and any dangling imports. `npm run build` clean.
- [ ] **Step 2:** `npm test` green; `npm run lint` clean.
- [ ] **Step 3: Commit** `git commit -am "chore(portal): remove dead magic-token auth code"`

---

## Done when
- A portal user reads/writes only their own rows **with RLS enforced** (verified by Task 9 Step 3 + Task 4 SQL test), not merely by query filters.
- Logout / logout-everywhere actually invalidate sessions (Task 8 Step 6).
- `npm test`, `npm run build`, `npm run lint` all pass.
- Operators (dashboard) are unaffected (additive policies; spot-check one operator dashboard page still loads its org's data).

## Out of scope (later Phase 0 plans)
- 0.2 — glass design-system shell, navigation, parity-screen rebuild.
- 0.3 — remaining new tables (`notifications`, `contract_acceptances`, `ticket_disputes`, `incident_reports`, `support_messages`) + payment-seam columns + in-portal notification scaffold.
- Migrating portal **write/upload** paths beyond auth (checkin/checkout mutations) to RLS — sequence after the read migration proves out.

## Known follow-ups (from code review — tracked, not yet done)
- **Refresh theft-detection (session-family revocation):** the rotation is now a CAS guard (a losing/replayed refresh gets 401), but presenting a *previously rotated* refresh token should additionally revoke the whole session family as a theft signal. Add before the refresh route is wired into a client interceptor.
- **Immediate login-deactivation:** `refresh` now rejects inactive logins, but `getPortalSession` does not re-check `active`, so a deactivated login can still render for up to the access-token lifetime. Clean fix: revoke that customer's `portal_sessions` rows at the moment an operator deactivates a login (operator-side, 0.3).
- **Per-request session read:** `getPortalSession`/`requirePortal` each do one `portal_sessions` admin read per call; memoize with React `cache()` when wiring routes in the read-migration to avoid 2+ reads per request.

## Task 9 status (read-route migration) — PAUSED, decision needed
Migration 031 adds portal RLS policies for `customers`/`contracts`/`tickets`/`portal_sessions`/`portal-uploads` only. Portal read routes that also touch `handover_photos` or the document buckets (`generated-docs`/`ticket-documents`) would return empty under the RLS client until those policies exist (0.3 territory). Options: (a) migrate only the fully-covered routes (`me`, `profile`, contracts list/detail, `loadPortalContract`) now and defer document/photo routes to 0.3; or (b) fold the whole read-migration into 0.3 with all missing policies. **Gate:** apply migration 031 and pass `supabase/tests/031_portal_rls.sql` (DB step) before pointing any route at the RLS client.
