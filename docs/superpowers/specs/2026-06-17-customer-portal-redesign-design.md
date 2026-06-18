# Customer Portal — Redesign & Rebuild (Vision / Design Doc)

- **Project:** Knöllchen-Pilot — customer (renter/driver) self-service portal
- **Date:** 2026-06-17
- **Branch:** `feat/customer-portal-rebuild` (off `main`)
- **Status:** Approved (spec reviewed) — Phase 0 implementation starting. **Update:** email sending removed by owner decision (see §1.7, §7.3).
- **Type:** Vision doc. Implementation proceeds **phase by phase**; each phase gets its own focused spec → plan → build. This document is the single source of truth for the whole portal; per-phase specs derive from it.

---

## 1. Context & directive

Knöllchen-Pilot is a multi-tenant SaaS for German car-rental companies ("orgs"). Its core product forwards parking/traffic fines (Strafzettel) to the renter who was driving (Weiterbelastung) plus a processing fee, and it manages the full rental lifecycle (contracts, handover, return, billing, customers, vehicles, damage). A **customer portal** already exists for renters but is shallow and read-mostly.

**Owner directive (verbatim intent):** *"Build every feature the customer can do that would make the life easier for the CEO of the rental company."* → The organizing principle of this rebuild is **maximize customer self-service**: every task a renter can do themselves is work the rental company no longer has to do, cash that arrives faster, and a dispute that is pre-empted.

### Decisions taken during brainstorming
1. **Scope:** Full rebuild — frontend **and** backend (auth/session, API routes, data model), not a reskin.
2. **Primary device:** **Mobile-first.** Renters mostly use the portal on a phone, standing at the car (check-in/out, photographing license/ID/vehicle, signing, paying).
3. **Visual identity:** **Match the operator dashboard exactly** — the existing "Leitstelle / Liquid Glass (Aurora Glass)" design system (see §9).
4. **Features:** Feature **parity + new features + improve existing** (full catalog in §11).
5. **Payments:** **Architect now, build Stripe later.** Build the data model + UI seams + open-amounts model now; defer the actual Stripe integration to a later phase.
6. **Delivery:** **One complete vision doc (this) + phased specs.** Build & ship incrementally.
7. **Email:** **Removed entirely** (later decision, commit `35c6da0`). No outbound or inbound email — the Postmark layer, the emailed magic-link, and `postmark-inbound` are deleted. Delivery is **operator-mediated links** (operator shares portal/check-in links) + **password login**; all customer notification is **in-portal only**.

---

## 2. Current state (verified against the codebase)

The portal lives under `src/app/portal/**` (route group `(app)`) with APIs under `src/app/api/portal/**`. It is a Next.js 14 App Router app on Supabase (Postgres + Storage). Today it provides: magic-link/password login, a dashboard, contracts list + detail, a 5-step self-check-in (license OCR, ID OCR, vehicle photos, signature), a 4-step self-check-out (photos, km, fuel), in-portal e-signature, a documents list, and profile edit.

**Auth/session today:** a *standalone* JWT system (not Supabase Auth). `customer_logins` rows (bcrypt password and/or single-use magic token) → an HS256 JWT `{customer_id, org_id, email}` in the httpOnly `kp_portal` cookie (30-day TTL). All portal DB access uses the **service-role client (RLS bypassed)**; isolation is enforced *only* by explicit `.eq('customer_id', …).eq('org_id', …)` filters and `loadPortalContract`'s triple-scope guard.

### Verified gaps & bugs (ground-truthed, not assumed)
> **Branch note:** facts verified against **`main`** (this rebuild's base). **Email update:** this rebuild has now *removed* the email layer entirely on `feat/customer-portal-rebuild` (commit `35c6da0`), aligning with the `launch-fixes` direction. The email bullet below is superseded by that removal; the other bullets still hold.

- **Email sending REMOVED (by decision, commit `35c6da0`).** The Postmark layer that existed on `main` is deleted: `postmark.ts`, `email-templates.ts`, the emailed `magic-link` route, the `postmark-inbound` webhook, and the `postmark` dependency. **Consequences baked into this design:** login is **password-only** (operator-provisioned; no emailed magic link); the operator's ticket-forwarding (`tickets/send`) now **marks the ticket weiterbelastet / authority-sent** and the operator delivers the PDFs manually; `checkin-link` **returns the link** for the operator to share; all customer notification is **in-portal only**. No email is sent or received anywhere.
- **No Stripe.** Not in `package.json` or code; only "coming soon / später" text in the marketing FAQ and AGB/Datenschutz legal pages.
- **Broken ticket-document download.** `/documents` writes the 3 ticket PDFs to the `generated-docs` bucket, but the portal download route reads a different bucket (`meta.bucket`) → portal ticket-document downloads are effectively broken.
- **`reminder_level` is dead** — referenced only in `types.ts`; no dunning logic.
- **No `payment_status` on contracts**; only `tickets.paid` exists. Deposit (`contracts.deposit`) is a single number with no held/released state.
- **Session is non-revocable** — `getPortalSession` only verifies the JWT signature/shape; disabling/deleting a login does not invalidate an already-issued 30-day cookie. No logout-everywhere; the only "password change" is the operator overwriting `password_hash` via the dashboard invite modal.
- **Isolation is app-level only** — service-role client bypasses RLS; a single forgotten filter in any new portal query would leak cross-customer data.

These gaps directly shape the foundation (§7) and phasing (§12).

---

## 3. Goals & non-goals

**Goals**
- Rebuild the portal UI from scratch, mobile-first, in the dashboard's glass design language.
- Rebuild the portal backend: revocable sessions, DB-enforced isolation (RLS), an **in-portal notification center** (no email), payment seams.
- Maximize self-service: collect money, offload counter/data-entry work, structure disputes/damage, deflect support.
- Maintain strict multi-tenant + per-customer isolation and a hard operator/customer redaction boundary (§10).

**Non-goals (v1)**
- Real Stripe integration (architected now, built in a later phase).
- Two-factor auth (deferred).
- Operator/dashboard features (this project is the renter-facing portal only).
- Customer-facing AI assistant (catalogued as "Could", later phase).
- Replacing the operator's Supabase-Auth identity model (operators stay as-is).
- **Any email or SMS sending** (removed by decision — operator-mediated link delivery + in-portal notifications instead).

---

## 4. Personas & design principles

**Primary persona — the renter ("Mieter"):** a German-speaking private or business customer, on a phone, often at the vehicle, sometimes time-pressured or stressed (e.g. a fine arrived). Wants clarity ("what do I owe / what do I do next") and speed.

**Design principles**
1. **Every visit has an obvious next action.** The home leads with "Zu erledigen".
2. **Mobile-first & resilient.** Camera capture, large touch targets, optimistic/fire-and-forget uploads, works on flaky forecourt connections.
3. **Redact operator internals.** The renter never sees operator-only data, AI verdicts, or secrets (§10).
4. **DB-enforced isolation.** Security does not depend on remembering a filter.
5. **One product.** Visually indistinguishable from the dashboard's design language.
6. **German-first (de-DE).** Single source of truth for labels and PDF copy.

---

## 5. Information architecture & sitemap

**Home (`Start`)** composition (top→bottom): **Attention band "Zu erledigen"** (sign, pay, complete check-in/out, missing docs) → **active-rental hero** → **rentals list** / open-amounts summary.

**Bottom nav (mobile) / tab bar (desktop):** `Start · Mieten · Strafzettel · Mehr`
- **Mehr** opens: Dokumente, Profil, Hilfe, Abmelden.

**Sitemap**
```
/portal/login                      Password login (operator-provisioned); no magic-link (email removed)
/portal/start                      Home: to-dos + active rental + open amounts
/portal/mieten                     Rentals list (active / upcoming / past)
/portal/mieten/[id]                Contract detail — TIMELINE-centric (status, costs, docs, actions)
/portal/mieten/[id]/checkin        Self-check-in wizard (license/ID OCR, photos, km, fuel, signature)
/portal/mieten/[id]/checkout       Self-check-out wizard (photos, km, fuel)
/portal/mieten/[id]/sign           AGB + special-terms acceptance → e-signature
/portal/mieten/[id]/schaden        During-rental damage / incident report  (Phase 3)
/portal/mieten/[id]/verlaengern    Rental extension request                 (Phase 3)
/portal/strafzettel                Tickets list
/portal/strafzettel/[id]           Ticket detail — breakdown, timeline, pay, acknowledge, dispute, docs
/portal/dokumente                  All documents & invoices (download)
/portal/profil                     Personal data, KYC (license/ID), consent, security
/portal/hilfe                      FAQ + structured support request          (Phase 4)
/portal/reservieren                Self-service booking request              (Phase 2)
```

Screen states are specified per screen in §6; every list/detail screen defines **loading, empty, error, and offline/retry** states.

---

## 6. Screen-by-screen design (summary)

For each screen: **purpose · key elements · primary actions · states · data source**.

- **Login** — Purpose: password entry (email + password); credentials are operator-provisioned (no emailed magic link). Elements: email + password → "Einloggen". States: invalid, rate-limited. Data: `customer_logins`. Forgot-password is operator-reissued (no email channel).
- **Start (home)** — Attention band (ActionCards from open tasks), RentalHero (active contract + status pill), open-amounts AmountRow, rentals shortcuts. Actions: deep-link into the relevant task. Empty: "Keine offenen Aufgaben". Data: contracts, tickets, notifications.
- **Mieten (list)** — Grouped active/upcoming/past contract cards. Actions: open detail, start check-in/out. Empty: "Noch keine Mieten".
- **Mieten/[id] (contract detail)** — **StatusTimeline** centerpiece (reserviert → unterschrieben → abgeholt → aktiv → zurückgegeben → abgerechnet), cost card (Tagespreis, Gesamt, Kaution, extra-km after return), documents, action buttons (sign, check-in/out, extend, report damage, pay). Redacted timeline (not raw `ticket_logs`).
- **checkin / checkout wizards** — Rebuilt `Wizard` shell with resumable step state. Steps: DocScan (license/ID → Claude Vision OCR back-fills `customers`), PhotoGrid (positional vehicle photos), km + **fuel** capture (pickup baseline added), SignaturePad. Optimistic uploads, per-step persistence.
- **sign** — `contract_acceptances`: render org AGB (`rental_terms`) + each selected special term, explicit timestamped + IP-logged per-block acceptance, then SignaturePad → signed contract PDF; stamps `signed_at`/`signed_ip`.
- **strafzettel (list) + [id] (detail)** — NEW. Detail: offense summary, **charge breakdown** (Bußgeld + Bearbeitungsgebühr inkl. 19% MwSt), redacted status timeline (hochgeladen → zugeordnet → weiterbelastet → bezahlt), document downloads (fixed bucket), and actions: **Pay** (seam), **Acknowledge** (IP-logged), **Dispute / "Ich war nicht der Fahrer"** (+ named driver, evidence) — actions land per phase.
- **dokumente** — Unified list: signed contract PDF, ticket Anschreiben/Rechnung, (later) real Lexoffice invoices. Signed-URL downloads.
- **profil** — Edit contact/address; KYC (license nr/class/expiry, re-upload expiring license, ID) with policy on document-derived vs free-typed fields; consent toggles; security (set/change password, **log out everywhere**).
- **hilfe** — FAQ + `support_messages` request form. **reservieren** — vehicle + date picker against availability → draft contract request.

---

## 7. Backend architecture

### 7.1 Auth & session (rebuild)
- Keep a **dedicated portal identity** (renters are **not** operator Supabase-Auth users).
- Issue a **portal JWT signed with the Supabase JWT secret**, carrying `role: "authenticated"` + custom claims `customer_id`, `org_id`, `session_id`. This lets PostgREST/RLS read the claims (§7.2).
- **Short-lived access token (~15 min) + rotating refresh token**, backed by a **`portal_sessions`** table (one row per device/login) → enables **revocation** and **logout-everywhere**. `getPortalSession` validates the JWT **and** checks the session row is still active (cheap, cacheable).
- **Password login** (operator-provisioned). The customer can **change** their password while logged in; there is **no** emailed magic-link and **no** self-service email reset (email removed) — forgot-password is operator-reissued. One-click login links can still be generated server-side and shared by the operator out-of-band.
- **Rate limiting** moves from in-memory to a DB-backed (or Upstash) store so it holds across serverless instances. IPs captured for audit on sign/acknowledge.

### 7.2 Isolation via real RLS (the core backend fix)
- Portal reads **stop using the service-role client**. They use the anon client **with the portal JWT** as the bearer.
- **Postgres RLS policies** on every portal-readable table and every new table key off `auth.jwt() ->> 'customer_id'` and `->> 'org_id'`. Isolation is enforced **at the database**, not in query code.
- Service-role is used **only** for explicitly privileged server actions (e.g. provisioning a login, webhook handlers) with their own guards — never for general portal reads.
- `loadPortalContract` / `getPortalCustomer` remain as defense-in-depth but are no longer the *only* line of defense.

### 7.3 Delivery & notifications (no email)
- **Email removed entirely** (commit `35c6da0`): no `postmark.ts`/`email-templates.ts`, no `magic-link`/`postmark-inbound`, no `postmark` dependency. Nothing in the portal sends or receives email.
- **Link delivery is operator-mediated:** server actions (e.g. `checkin-link`) return the portal/check-in URL; the operator shares it via their own channel (WhatsApp/SMS/in-person). Logins are operator-provisioned.
- **Notifications are in-portal only:** the notification center (§7.5) is the single customer-facing channel for reminders, document-ready, and status changes — surfaced on next visit, not pushed.
- An outbound channel (email or SMS), if ever wanted, is a fresh separate decision; explicitly out of scope here.

### 7.4 Payment seams (build now, Stripe later)
- A unified **"open amounts"** model: a single server function aggregates everything a customer owes (rental total, extra-km, ticket fine + processing fee, later deposit) into typed line items with `payment_status`.
- New columns: `payment_status` / `paid_at` / `amount_*` on `contracts`; `paid_at` / `payment_status` on `tickets` (alongside existing `paid`).
- `/api/portal/**/pay` endpoints + Pay UI exist but return **"Zahlung noch nicht verfügbar"** until Stripe lands; the Stripe integration point is a future `/api/webhook/stripe` + Stripe Elements. No `@stripe/*` dependency added yet.

### 7.5 Notifications
- `notifications` table (per-customer, RLS-scoped) + **in-portal** notification center (no email fan-out). A **Vercel cron** (`/api/cron/reminders`, pattern exists for `/api/health`) populates reminders (return due, ticket unpaid, contract unsigned, check-in incomplete) and activates the dead `reminder_level` — surfaced in-portal on next visit.

### 7.6 Storage & buckets
- **Fix the bucket mismatch** so ticket-document downloads work.
- Per-customer object paths (`org_id/customer_id/...`); time-limited signed URLs; storage RLS aligned with table RLS. Customer may *upload* damage/evidence photos but never read operator-only objects.

---

## 8. Data model changes (summary; detailed DDL in the Phase 0 spec)

New tables (all RLS-scoped to `customer_id` + `org_id`):
- `portal_sessions` — session/device rows for revocation & logout-everywhere.
- `notifications` — per-customer notification feed.
- `contract_acceptances` — per-block AGB/special-terms consent (text snapshot + `accepted_at` + IP).
- `ticket_disputes` — dispute status/reason + named-driver fields.
- `incident_reports` — during-rental damage reports (+ photos via storage).
- `support_messages` — Hilfe/support requests.

New columns:
- `contracts`: `payment_status`, `paid_at`, `amount_*`, deposit hold/release status (later), `fuel_level_pickup` writeable on the customer path.
- `tickets`: `payment_status`, `paid_at`, `acknowledged_at`, `acknowledged_ip`, dispute linkage.
- `customers`: marketing/data-processing **consent** columns (`marketing_opt_in`, `consent_at`, `consent_source`).

Migrations are additive and ordered; existing operator behavior is preserved.

---

## 9. Design system application

Reuse the dashboard's tokens **verbatim** (defined in `src/app/globals.css` + `tailwind.config.ts`):
- `workspace-aurora` fixed background; `glass-card` / `glass-chrome` / `glass-raised` surfaces; `glass-sheen`, `glass-active`.
- **Apple-blue `signal` (#0071e3)** for CTAs/active/links; teal lives in the aurora backdrop (so CTAs are blue, not teal).
- `plate` Kennzeichen component; 20px card radius; `.field` inputs; `.kicker`, `.mark` typographic atoms.
- Mobile primitives: `touch-target` (44px), `safe-bottom`, `scroll-snap-x`, iOS 16px input rule.

**Portal component kit** (built on those tokens): `ActionCard`, `StatusTimeline`, `RentalHero`, `AmountRow`, `PhotoGrid`, `DocScanStep`, `SignaturePad`, `WizardShell`, `StatusBadge`, `NotificationItem`, `EmptyState`. Accessibility: keyboard + screen-reader support for signature/photo/payment flows; non-color status cues on timelines.

---

## 10. Security, privacy & redaction boundary

**Never exposed to the portal:** `ai_raw_response`, `ai_confidence`, operator notes, full `ticket_logs`, partner/purchase/selling/margin data, the AI damage-comparison **verdict**, GPS/echoes data, and any secret (`lexoffice_api_key`, Shopify/echoes credentials). Customer-facing timelines are **redacted projections**, not raw logs.

**Threat model focus:** IDOR (RLS + ownership guards on every object), session theft/revocation (`portal_sessions`), file access (scoped paths + signed URLs + storage RLS), rate-limited auth, GDPR (explicit consent capture + withdrawal, document retention policy for license/ID scans). Customers may *submit* damage photos but must never run or see the AI verdict.

---

## 11. Feature catalog (full, by phase)

Tiers: **Must** (highest CEO value) · **Should** · **Could** · **Won't (v1)**. Type: new / improve / parity. (Effort S/M/L.)

**Phase 0 — Foundation:** rebuilt auth/session + revocation/logout-everywhere (rebuild, M); RLS-backed isolation (harden, M); glass design-system shell (rebuild, M); in-portal notification center scaffold (new, S); payment seams + columns (new, M); Stripe infra deferred; **password login + in-session password change** (operator-provisioned; no email) (Should/improve, S).

**Phase 1 — Collect the money:** portal ticket-detail + status timeline (Must/new, M); online payment of all open amounts — *seam now, Stripe later* (Must/new, L); fix ticket document downloads (Must/fix, S); auto-create portal login on contract/Shopify create + operator-shared access link, no email (Must/improve, M); **in-portal** reminder/dunning surface + one-click pay, no email (Should/new, M); real Lexoffice invoice retrieval + download (Should/new, M).

**Phase 2 — Offload the counter:** pre-arrival data + license/ID self-fill (Must/improve, M); self-service reservation/booking request (Should/new, L); explicit AGB + special-terms acceptance (Should/new, M); pickup km + fuel capture at check-in (Should/improve, S); live contract status timeline + notification center (Should/improve, M); harden signed-contract & document inbox (Should/harden, S).

**Phase 3 — Disputes, damage & revenue:** Einspruch / "Ich war nicht der Fahrer" + named-driver (Should/new, L); during-rental damage/incident report with photos (Should/new, M); one-click rental extension (Should/new, L); post-return cost summary + deposit-refund status (Should/new, M); charge acknowledgment, IP-logged (Should/new, S); counter-evidence upload (Could/new, M); self-service Zeugenfragebogen data (Could/improve, M).

**Phase 4 — Depth & deflection:** saved payment method + Kautions-Hold via Stripe (Could/new, L); customer-facing read-only AI assistant (Could/improve, L); in-portal FAQ/help + support request (Could/new, M); self-maintain KYC master data (Could/improve, S); consent/marketing opt-in (Could/new, M); two-factor auth (**Won't v1**, L).

**Parity to rebuild** (carried, not lost): password auth (operator-provisioned, decoupled, +revocation); dashboard cards + open-amounts banner; documents tab (fixed bucket); 5-step check-in; 4-step check-out; in-portal e-signature; signed-contract PDF download; profile self-edit; per-contract cost card; multi-tenant scoping; 10-position handover photo capture.

---

## 12. Phasing & delivery

Each phase below becomes its **own spec → plan → build increment**. Phase 0 is the next deliverable. *(The earlier email base-branch gate is resolved: email is removed entirely — see §1.7 / §7.3.)*

- **Phase 0 — Foundation:** auth/session + RLS + glass shell + in-portal notifications + payment seams. *Unblocks everything; ships the rebuilt shell with parity flows on the new substrate.*
- **Phase 1 — Collect the money:** ticket detail, payment seams live, document fix, auto-provisioning, reminders, Lexoffice invoice retrieval.
- **Phase 2 — Offload the counter:** pre-arrival self-fill, reservation, terms acceptance, pickup km/fuel, status timeline + notifications.
- **Phase 3 — Disputes, damage & revenue capture.**
- **Phase 4 — Depth & deflection** (incl. real Stripe build for saved methods/deposit-hold, AI assistant, FAQ, 2FA-later).

**Cross-cutting (every phase):** revocable sessions; RLS on new tables; redaction; mobile-first/camera/offline resilience; de-DE i18n; accessibility; additive migrations.

---

## 13. Open questions (proposed defaults; confirm before/with each phase)
1. **AI-filled KYC re-confirmation** — require operator re-confirmation before a contract references AI-OCR'd KYC? *Default: operator confirms KYC-critical fields (license nr/class/expiry); contact/address customer-confirmed.*
2. **Zeugenfragebogen visibility** — is the witness questionnaire (a B2G doc to the authority) ever customer-downloadable? *Default: not downloadable; customer can supply/confirm its data only.*
3. **Customer-typed vs document-derived KYC** — which fields are free-typed? *Default: license_nr/class/expiry document-derived; contact/address free-typed.*
4. **Reservation confirmation** — auto-confirm against availability or always operator-reviewed draft? *Default: operator-reviewed draft for v1.*
5. **Payments v1 scope** — SEPA vs card/Apple Pay first (when Stripe is built). *Default: card + Apple/Google Pay first; SEPA later.*
6. **Email — resolved (removed).** Per owner decision, all email sending/receiving is removed (commit `35c6da0`). Delivery = operator-mediated links + password login; notifications = in-portal only. Any future outbound channel (email/SMS) is a separate, later decision.

---

## 14. Risks & mitigations
- **RLS migration risk** (switching portal off service-role) → ship Phase 0 behind thorough isolation tests; keep app-level guards as defense-in-depth.
- **Match-ambiguity for tickets** (overlapping rentals on a plate/date) → surface a needs-review state instead of silently picking one (operator-side; portal only shows confirmed matches).
- **Deferred Stripe** → seams must be real (data model + open-amounts) so the later build is drop-in, not a refactor.
- **No outbound channel** (email removed) → customers must visit the portal to see reminders/status, and logins/links are operator-delivered. Mitigation: a strong in-portal "Zu erledigen" surface + operator UX to copy/share links; revisit an SMS/email channel only as a separate later decision.
- **Scope creep** → MoSCoW tiers + phase gates; "Could/Won't" items explicitly deferred.

## 15. Success metrics (CEO value)
- ↓ manual operator touches per rental (provisioning, data entry, link sending, reconciliation).
- ↓ Days-Sales-Outstanding on tickets/invoices; ↑ share paid online before/at pickup.
- ↑ self-check-in/out completion rate; ↓ inbound "status/cost/where-is-my-doc" calls.
- ↓ liability/damage disputes via timestamped, IP-logged consent + structured reports.
