# Leitstelle — Design System (source of truth)

The redesign of Knöllchen-Pilot. Concept: **the dispatch control room** for a rental
fleet. Knöllchen-Pilot is the calm command center that swallows the chaos of Strafzettel,
Verträge and Übergaben. Bold, industrial, engineered — never generic SaaS.

## Tokens (Tailwind classes — already configured)

**Dark side** (landing + app chrome): `bg-void` `bg-void-800` `bg-void-700` `bg-void-600`,
text `text-on-dark` (#f4f2ef) / `text-on-dark` opacities, borders `border-hairline-dark`.
Use CSS vars `--on-dark-soft` (#a8a4a0) and `--on-dark-muted` (#6e6a67) for secondary text,
or `text-white/70`, `text-white/45`.

**Light side** (workspace + light bands): `bg-canvas` (#F4F3F0) page, `bg-paper` (#fff) cards,
text `text-ink` / `text-ink-soft` / `text-ink-muted`, borders `border-hairline`.

**Signal** = `#FF5A1F`. Classes `bg-signal` `text-signal` `bg-signal-strong` `bg-signal-soft`
`text-signal-ink`. ROLE RULE: primary CTA / active nav / live status ONLY. Never a background
wash, never decorative.

**Plate EU blue** `#003399` (`text-plate-eu`): license-plate strip + the "K" of the logo ONLY.

## Type

- Headings → `font-display` (Archivo, tight `tracking-tightest` -0.03em). Big, compact, confident.
- Body/UI → default (Inter).
- Data / IDs / plates / metrics / eyebrows → `font-mono` (JetBrains Mono), `tnum` for numbers.
- Eyebrows → `.kicker` class (mono, uppercase, signal tick prefix). e.g. `<span className="kicker">Die Leitstelle</span>`.
- One brand-mark moment per hero: wrap a key phrase in `<span className="mark">…</span>` (signal underline). Use ONCE.

## Shape & depth

- Radius: cards `rounded-card` (8), panels `rounded-panel` (6), buttons/inputs `rounded-btn`/`rounded-input` (6),
  dark technical frames `rounded-frame` (4), status chips `rounded-full`.
- Depth from **1px hairline borders + tone**, not blur. Shadows: `shadow-panel` (light cards),
  `shadow-frame` (dark hero mockups), `shadow-signal` (signal CTA only). Avoid soft glows.
- Sharp, engineered. No big rounded friendly cards.

## Textures (utility classes)

- `.grid-light` / `.grid-dark` — faint 56px engineering grid. Use on hero / section backgrounds.
- `.dot-dark` — dotted texture for dark command sections.

## Primitives (import & reuse — do NOT re-implement)

- `import { Plate } from "@/components/ui/Plate"` — `<Plate value="B-KP 2041" size="sm|md|lg|xl" />`
- `import { Logo } from "@/components/ui/Logo"` — `<Logo tone="light|dark" size={30} />`
- `import { Button, ButtonLink } from "@/components/ui/Button"` — variants: `signal` (primary),
  `ink` (strong neutral on light), `ghost` (quiet on light), `outline-dark` (secondary on void).
- `import { StatusPill, PIPELINE } from "@/components/ui/StatusPill"` — the 4-state pipeline.

## The processing pipeline (the operational motif)

`Neu → Zugeordnet → Weiterbelastet → Bezahlt`. Render as connected segments (the "Leitstelle rail").
Appears on the landing (explained) and in the dashboard (live). Use `PIPELINE` for labels/colors.

## Product facts (use real copy, not lorem)

Car-rental operations platform. Modules: **Verträge** (contracts + e-signature + Übergabe/handover
with photos), **Strafzettel** (KI liest Bescheide aus → ordnet Fahrer zu → belastet weiter),
**Kunden** (CRM + Portal), **Fahrzeuge** (Flotte), **Schäden** (damage reports), **Kalender**,
**Dynamic Pricing**, **Auswertung/Reports**. Audience: German rental-shop owners (non-technical).
Tone: confident, operational, plain German. Pricing tiers exist (Starter / Pro / Enterprise);
Stripe + E-Mail-Inbound are "bald verfügbar" (coming soon). OCR/KI is real (Claude Vision).

## Dashboard UI kit (interior pages — reuse, do NOT re-implement)

The dashboard is a LIGHT engineered workspace (`bg-canvas`) inside dark chrome (sidebar/topbar).
Every interior page should use these:

- `import { PageHeader } from "@/components/ui/PageHeader"` — top of each page. Props: `kicker?`,
  `title`, `description?`, `actions?`. Renders mono kicker + display title.
- `import { Panel, PanelHeader } from "@/components/ui/Panel"` — the standard card surface
  (`bg-paper border border-hairline rounded-card shadow-panel`, `p-5` unless `flush`). `PanelHeader`
  props: `title`, `kicker?`, `Icon?`, `actions?`.
- `import { EmptyState } from "@/components/ui/EmptyState"` — empty tables/lists. Props `Icon?`,
  `title`, `description?`, `action?`.
- `import { FilterTabs, SearchInput, IconButton } from "@/components/ui/Toolbar"` — list toolbars.
- `import { Button, ButtonLink } from "@/components/ui/Button"` — variants `signal` (primary action),
  `ink` (strong neutral), `ghost` (quiet), `outline-dark` (on dark only).
- `import { StatusPill } from "@/components/ui/StatusPill"` (or existing `StatusBadge`, now delegates).
- `import { Plate } from "@/components/ui/Plate"` — render EVERY Kennzeichen as `<Plate value={plate} size="sm" />`
  instead of bare mono text. This is the signature motif; use it in tables, detail headers, vehicle refs.

Utility classes (globals.css): `.panel`, `.th` (table-head cell), `.data-label` (mono uppercase label),
`.field` (form input/select/textarea). Prefer these over bespoke `ring-1 ring-black/5 rounded-2xl`.

Conversion rules when reskinning existing pages (find → replace intent):
- `rounded-2xl/xl ring-1 ring-black/[0.05] bg-white` → `panel` (or `<Panel>`).
- `bg-stone-50 / text-stone-*` → `bg-canvas / text-ink / text-ink-soft / text-ink-muted`.
- `ring-stone-200 / border-stone-100/200` → `border-hairline`.
- teal/emerald/indigo/violet accent links & buttons → `text-signal` / `<Button variant="signal">` (CTA only).
- bare mono plate text → `<Plate>`.
- section labels `uppercase tracking-wider text-stone-400` → `.kicker` or `.data-label`.
- Keep ALL data fetching, props, server/client boundaries, and behavior identical. Visual reskin only.
- Numbers/money/IDs/dates → `font-mono tnum`.

## Anti-slop guardrails

Reject: indigo/violet/teal brand accents, soft pastel rounded cards, big blurry drop shadows,
glow, editorial-serif word-swaps, warm cream canvases, generic hero→3-feature-grid→pricing→FAQ
with no concept. Every section ties back to the Leitstelle concept.
