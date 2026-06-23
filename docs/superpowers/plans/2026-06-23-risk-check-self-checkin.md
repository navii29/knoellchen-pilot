# KI-Bonitäts-/Risikocheck im Self-Check-in — Implementation Plan

> **For agentic workers:** Execute via superpowers:subagent-driven-development. Fresh subagent per task + spec review + code review.

**Goal:** Beim Self-Check-in läuft (nach Einwilligung) eine KI-Risikoprüfung auf den bereits erhobenen Daten und liefert dem Betreiber eine Ampel (grün/gelb/rot) + Begründung; „rot" blockt die Vertrags-Aktivierung weich (Betreiber kann mit Grund freigeben).

**Architecture:** Kein externer Bonitäts-Provider (Schufa o. ä.) — reine KI-Bewertung (Claude) auf vorhandenen Signalen. Signale werden serverseitig zusammengestellt (`lib/risk.ts`), an Claude geschickt (`lib/anthropic.ts: assessRentalRisk`), Ergebnis auf den Vertrag persistiert. UI: Einwilligung im Portal-Check-in; Ampel + Override im Dashboard-Vertrag; Soft-Block bei Aktivierung.

**Tech Stack:** Next.js App Router, Supabase, Claude (claude-sonnet-4-6, structured output), Vitest.

**Datenschutz:** Verarbeitung nur nach Einwilligung (`risk_consent`). Ergebnis sieht der Betreiber, nicht der Kunde. Keine externen Auskunfteien.

---

## Datenmodell (Migration 055, contracts)

- `risk_consent BOOLEAN DEFAULT false` — Kunde hat der Prüfung zugestimmt
- `risk_level TEXT` — 'gruen' | 'gelb' | 'rot' | null
- `risk_score INTEGER` — 0–100 (höher = riskanter)
- `risk_summary TEXT` — kurze Begründung (de)
- `risk_factors JSONB` — Array von {label, severity, detail}
- `risk_checked_at TIMESTAMPTZ`
- `risk_override_by UUID REFERENCES users(id)` — Betreiber-Freigabe trotz rot
- `risk_override_at TIMESTAMPTZ`
- `risk_override_reason TEXT`

Risiko-Stufen aus Score: rot ≥ 67, gelb ≥ 34, sonst grün. (Schwellen als Konstanten in lib/risk.ts.)

## Signale (lib/risk.ts → RiskSignals)

Aus Contract + Customer + Historie (alles org-scoped, serverseitig):
- Führerschein: vorhanden? gültig (expiry ≥ heute)? Klasse passend? Name == renter?
- Ausweis: vorhanden? Name/Geburtsdatum plausibel?
- Alter (aus birthday): < 21 / < 25 (Risikoaufschlag bei jung)
- Adresse vollständig (street/zip/city)?
- Historie: Anzahl früherer Verträge des customer_id; davon offene/überfällige Zahlungen (payment_status='offen' & überfällig); frühere Schäden; offene Strafzettel
- Mietwert vs. Kaution: total_amount / deposit-Verhältnis; Fahrzeug-Tageswert
- Kontaktqualität: E-Mail + Telefon vorhanden?

`assembleRiskSignals(...)` ist pure (bekommt schon geladene Daten), gut testbar. `deriveHeuristicScore(signals)` liefert einen Basis-Score + Faktoren rein deterministisch (Fallback ohne KI). Die KI verfeinert Summary/Score.

---

## Task 1: Datenmodell + Typen

**Files:** Create `supabase/migrations/055_contract_risk.sql`; Modify `src/lib/types.ts` (Contract-Interface um die risk_*-Felder).

- Migration mit den oben genannten Spalten (ADD COLUMN IF NOT EXISTS).
- Contract-Interface: `risk_consent`, `risk_level`, `risk_score`, `risk_summary`, `risk_factors` (unknown/Array), `risk_checked_at`, `risk_override_by/at/reason` (alle nullable außer risk_consent boolean).
- Verifizieren: `npx tsc --noEmit` (Mocks in scripts/preview-contract.ts ggf. ergänzen).

## Task 2: Risiko-Logik (lib/risk.ts) + Tests (TDD)

**Files:** Create `src/lib/risk.ts`, `src/lib/risk.test.ts`.

- Typen `RiskSignals`, `RiskFactor`, `RiskResult` ({level, score, summary, factors}).
- `RISK_THRESHOLDS = { rot: 67, gelb: 34 }`; `levelFromScore(score)`.
- `assembleRiskSignals(input)` pure: nimmt {contract, customer, history} und baut RiskSignals.
- `deriveHeuristicScore(signals): RiskResult` — deterministische Punktevergabe (ungültiger/fehlender FS → hoch, junge Fahrer, offene Zahlungen, kein Kontakt, Mietwert ≫ Kaution …) + Faktoren-Liste.
- Tests: levelFromScore-Grenzen; ein „sauberer" Mieter → grün; abgelaufener FS + offene Zahlung → rot; junger Fahrer ohne Historie → gelb.
- TDD: erst Tests, dann Implementierung; `npx vitest run src/lib/risk.test.ts`.

## Task 3: KI-Bewertung (lib/anthropic.ts: assessRentalRisk)

**Files:** Modify `src/lib/anthropic.ts`.

- `assessRentalRisk(signals: RiskSignals, heuristic: RiskResult): Promise<RiskResult>` — Claude (claude-sonnet-4-6) bekommt die Signale + den Heuristik-Vorschlag als JSON, gibt verfeinerten {level, score (0–100), summary (de, 1–2 Sätze), factors[]} zurück (striktes JSON, robustes Parsen wie bei den anderen Parsern; bei Fehler Fallback = heuristic).
- Keine Rohdokumente nötig — nur die abgeleiteten Signale (Datensparsamkeit).

## Task 4: API-Route POST /api/contracts/[id]/risk-check

**Files:** Create `src/app/api/contracts/[id]/risk-check/route.ts`.

- Auth + org-scope (Vertrag muss zur Org gehören). Lädt Contract, Customer (org-scoped, falls customer_id), Historie (frühere Verträge/Zahlungen/Schäden/Tickets org-scoped).
- `assembleRiskSignals` → `deriveHeuristicScore` → `assessRentalRisk` → persistiert risk_* auf dem Vertrag (admin, org-scoped). Setzt risk_checked_at.
- Body optional `{ consent?: boolean }`: wenn true, risk_consent=true setzen. Ohne consent (und ohne bestehende Einwilligung) → 409 „Einwilligung fehlt".
- Zusätzlich PATCH/Sub-Action für Override: `{ action: 'override', reason }` → setzt risk_override_by/at/reason (nur Owner/berechtigt). Alternativ eigene Route — Implementer entscheidet, dokumentiert.
- logActivity('contract.risk_check').

## Task 5: Self-Check-in — Einwilligung + Auslösung

**Files:** Modify `src/app/portal/(app)/contracts/[id]/checkin/CheckinClient.tsx` und die zugehörige Sign-/Abschluss-Route (`src/app/api/portal/contracts/[id]/sign/route.ts` oder Step-Route).

- Im Check-in vor dem Unterschreiben eine Einwilligungs-Checkbox „Ich stimme einer Bonitäts-/Risikoprüfung zu" (Pflicht oder optional — wenn abgelehnt, kein Check, Vertrag bleibt ohne Score). Text knapp + DSGVO-konform.
- Bei Abschluss (sign) serverseitig: wenn Einwilligung erteilt, risk_consent setzen und den Risk-Check anstoßen (intern aufrufen bzw. Logik wiederverwenden — keine Secrets im Client). Fehler im Check darf den Check-in NICHT blockieren (best-effort).

## Task 6: Dashboard — Ampel, Faktoren, Override, Soft-Block

**Files:** Create `src/components/contract/RiskBadge.tsx`; Modify `src/app/dashboard/contracts/[id]/page.tsx` (Anzeige) und die Aktivierungs-Route `src/app/api/contracts/[id]/activate/route.ts` (Soft-Block).

- RiskBadge: Ampel (grün/gelb/rot) + Score + Summary + Faktoren-Liste; „Manuell prüfen"-Button (ruft risk-check) und „Trotzdem freigeben"-Override (Grund-Eingabe) — nur Betreiber.
- Vertrags-Detail zeigt den Risk-Block.
- Aktivierung (activate): wenn risk_level='rot' und kein Override → 409 „Risiko rot — bitte prüfen und freigeben". Mit Override erlaubt.
- redactVehiclecost/Margen unberührt; keine Kostendaten im Risk-Block.

## Final
- `npx tsc --noEmit` + `npm run build` + `npx vitest run` grün.
- Ein PR mit Migration 055; Reminder an User: Migration einspielen.
