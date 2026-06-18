# Portal Phase 0.2 — Glass Shell + Navigation + Parity-Screen Rebuild — Plan

> **For agentic workers:** UI phase — verification is `npm run build` + visual preview (`npm run dev`), not unit tests. Steps use `- [ ]`.

**Goal:** Rebuild the customer portal UI in the dashboard's "Liquid Glass / Leitstelle" language, mobile-first, with the new information architecture (Start · Mieten · Strafzettel · Mehr) and a reusable portal component kit — at feature parity with today's portal.

**Architecture:** A small **portal component kit** built on the existing glass tokens (`glass-card`/`glass-chrome`/`glass-raised`/`glass-sheen`/`glass-active`, `workspace-aurora`, Apple-blue `signal`). The `(app)` layout gets the aurora field; `PortalShell` becomes glass chrome with a 4-tab bottom nav. Each screen is rebuilt on the kit. **No route renames** (keep `/portal/dashboard`, `/portal/contracts/...` to avoid breaking check-in/out links + redirects); only labels/content/look change, plus two new pages (`/portal/strafzettel`, `/portal/mehr`).

**Tech:** Next 14 App Router (server components), Tailwind, lucide-react. Tokens in `src/app/globals.css` + `tailwind.config.ts`.

**Spec:** `docs/superpowers/specs/2026-06-17-customer-portal-redesign-design.md` §5 (IA), §6 (screens), §9 (design system).

**Branch:** `feat/customer-portal-rebuild`.

## Design decisions (locked from the vision doc)
- **Home (Start)** = attention band "Zu erledigen" (unsigned contract / open amounts / incomplete check-in) → active-rental hero → rentals list. Route stays `/portal/dashboard`.
- **Tabs:** `Start` (`/portal/dashboard`) · `Mieten` (`/portal/contracts`) · `Strafzettel` (`/portal/strafzettel`, new) · `Mehr` (`/portal/mehr`, new → Dokumente, Profil, Abmelden).
- **Look:** match the dashboard verbatim — glass cards over the teal→blue→indigo aurora, blue CTAs, 20px radius, mobile primitives (`touch-target`, `safe-bottom`, iOS 16px inputs).
- **Strafzettel list** is parity-level (offense, status, amount, link); the rich ticket-detail (pay/dispute/timeline) is **Phase 1**.
- Data fetching stays as-is (admin client + `.eq` filters) for this visual phase; migrating portal *pages* to the RLS client is **0.3** (contracts/tickets are covered, so it's a clean follow-on).

## File structure
- Create `src/components/portal/kit/` — `Surface.tsx` (glass card), `ActionCard.tsx`, `RentalHero.tsx`, `StatusBadge.tsx`, `AmountRow.tsx`, `EmptyState.tsx`, `SectionLabel.tsx`, `StatusTimeline.tsx`. One component per file, each a pure presentational unit (props in, JSX out).
- Modify `src/app/portal/PortalShell.tsx` — glass chrome + 4-tab nav.
- Modify `src/app/portal/(app)/layout.tsx` — add `workspace-aurora` field + canvas bg.
- Modify `src/app/portal/(app)/dashboard/page.tsx` — Start home on the kit.
- Modify `src/app/portal/(app)/contracts/page.tsx` — Mieten list on the kit.
- Modify `src/app/portal/(app)/contracts/[id]/page.tsx` — timeline-centric detail.
- Modify `src/app/portal/(app)/documents/page.tsx`, `profile/*` — glass.
- Create `src/app/portal/(app)/strafzettel/page.tsx` — tickets list.
- Create `src/app/portal/(app)/mehr/page.tsx` — Dokumente/Profil/Abmelden menu.
- Modify `src/app/portal/login/page.tsx` / `LoginClient.tsx` — glass polish (optional).

---

## Chunk 1 — Foundation: kit + shell + aurora + Home + Mieten list  *(first previewable slice)*

### Task 1: Portal component kit
**Files:** Create the 8 files under `src/components/portal/kit/`.
- [ ] Build `Surface` (glass-card + optional `glass-sheen`, rounded-card, padding variants), `SectionLabel` (kicker), `EmptyState` (icon + text), `StatusBadge` (status→color map: neu/offen=amber, aktiv/zugeordnet=blue, weiterbelastet=violet, bezahlt/abgeschlossen=emerald), `AmountRow` (label + mono EUR), `ActionCard` (icon tile + title + subtitle + chevron/CTA, accent border-left), `RentalHero` (gradient header with plate + vehicle + status pill + dates + CTA row), `StatusTimeline` (vertical dots/line, done vs pending steps, non-color cue via filled/outline dot).
- [ ] `npm run build` clean.
- [ ] Commit `feat(portal-ui): glass component kit`.

### Task 2: Glass shell + aurora
**Files:** `PortalShell.tsx`, `(app)/layout.tsx`.
- [ ] Add `<div className="workspace-aurora" />` (fixed) + `bg-canvas` wrapper in the `(app)` layout (mirror the dashboard layout).
- [ ] Rebuild `PortalShell`: `glass-chrome` top header (logo + org + greeting + logout), `glass-chrome` bottom nav (fixed, `safe-bottom`) with tabs Start/Mieten/Strafzettel/Mehr using `glass-active` pill on the active tab; desktop variant. Content max-width container over the aurora.
- [ ] `npm run build` clean; **user previews** `npm run dev` → `/portal/dashboard`.
- [ ] Commit `feat(portal-ui): glass shell + aurora + 4-tab nav`.

### Task 3: Home (Start)
**Files:** `(app)/dashboard/page.tsx`.
- [ ] Compute to-dos: unsigned active contract, open ticket amounts, incomplete check-in (`checkin_step`). Render the attention band as `ActionCard`s (only when present), then the active-rental `RentalHero`, then a rentals list (`Surface` + rows) with a link to Mieten. Empty state when nothing.
- [ ] Build clean; **user previews**.
- [ ] Commit `feat(portal-ui): glass Start home (attention band + rental hero)`.

### Task 4: Mieten list
**Files:** `(app)/contracts/page.tsx`.
- [ ] Rebuild the contracts list on `Surface` rows + `StatusBadge` + `Plate`. Group active/past. Empty state.
- [ ] Build clean; **user previews**.
- [ ] Commit `feat(portal-ui): glass Mieten list`.

**→ Pause after Chunk 1 for user visual review before Chunk 2.**

---

## Chunk 2 — Detail + Strafzettel + Mehr + Dokumente/Profil

### Task 5: Mieten detail (timeline-centric)
**Files:** `(app)/contracts/[id]/page.tsx` (+ its client if any).
- [ ] `RentalHero` + `StatusTimeline` (reserviert→unterschrieben→abgeholt→aktiv→zurückgegeben→abgerechnet from `status`/`signed_at`/`checkin_step`/`checkout_step`/`actual_return_date`) + cost `Surface` (Tagespreis, Gesamt, Kaution) + action buttons (sign/check-in/check-out as today) + linked documents/tickets. Keep existing actions/links working.
- [ ] Build clean; user previews. Commit.

### Task 6: Strafzettel list (new)
**Files:** Create `(app)/strafzettel/page.tsx`.
- [ ] List the customer's tickets (via contracts!inner join, as the dashboard does): offense/ticket_nr, `StatusBadge`, amount (`total_charge`), date, link to the contract (ticket-detail is Phase 1). Empty state. Add the tab target.
- [ ] Build clean; user previews. Commit.

### Task 7: Mehr + Dokumente + Profil
**Files:** Create `(app)/mehr/page.tsx`; modify `documents/page.tsx`, `profile/*`.
- [ ] `Mehr`: menu rows (Dokumente, Profil, Abmelden) on `Surface`/`ActionCard`. `Dokumente`/`Profil`: re-skin on the kit (Profil keeps the existing PATCH form, glass inputs).
- [ ] Build clean; user previews. Commit.

### Task 8: Login polish + final
**Files:** `login/page.tsx`/`LoginClient.tsx` (optional), final pass.
- [ ] Optional glass polish on login. `npm run build` + `npm run lint` clean. Quick accessibility pass (focus states, `aria` on nav, non-color status cues).
- [ ] Commit. Final visual review with user.

## Done when
- Every portal screen renders in the glass language, mobile-first, at parity with today + the new 4-tab IA; `npm run build` + `npm run lint` clean; user signs off visually.

## Out of scope
- Ticket-detail (pay/dispute/timeline) → Phase 1. New self-service features → 1–4. Migrating portal *pages* to the RLS client → 0.3.
