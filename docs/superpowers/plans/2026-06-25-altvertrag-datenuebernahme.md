# Datenübernahme aus Verträgen — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Beim Anlegen/Import eines Vertrags automatisch Kunde & Fahrzeug anlegen/abgleichen (fill-if-empty, Matching FS-Nr → Name+Geburtstag → neu), pro Fahrzeug ein vollständiges Vertrags-Archiv.

**Architecture:** Eine reine, testbare Logik-Schicht (`src/lib/contract-takeover.ts`) + ein dünner DB-Service (`applyTakeover(admin, orgId, contractIds)`), den ALLE 4 Vertrags-Insert-Stellen und eine neue Bestands-Backfill-Route aufrufen. Fahrzeug-Backfill bleibt in `vehicle.ts`, wird um Felder erweitert. Schema-Ausbau via Migration 065.

**Tech Stack:** Next.js App Router (Route Handlers), Supabase (PostgREST + admin client), TypeScript, vitest.

**Spec:** `docs/superpowers/specs/2026-06-25-altvertrag-datenuebernahme-design.md`

---

## Chunk 1: Schema + reine Logik + Tests

### Task 1: Migration 065 — neue Spalten + Index

**Files:**
- Create: `supabase/migrations/065_contract_data_takeover.sql`

- [ ] **Step 1: Migration schreiben**

```sql
-- Migration 065 — Datenübernahme aus Verträgen
-- Neue Stammdatenfelder auf customers + Spiegelfelder auf contracts.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS birth_place       TEXT,
  ADD COLUMN IF NOT EXISTS id_card_authority TEXT,
  ADD COLUMN IF NOT EXISTS license_issued    DATE,
  ADD COLUMN IF NOT EXISTS iban              TEXT,
  ADD COLUMN IF NOT EXISTS bank_holder       TEXT,
  ADD COLUMN IF NOT EXISTS bic               TEXT;

-- Vertrag trägt den vollen Mieter-Datensatz (Datumsfelder als TEXT, konsistent
-- mit bestehendem renter_birthday/renter_license_expiry) + Fahrzeug-Felder fürs
-- Backfill. weekly_rate/monthly_rate NUR auf contracts (auf vehicles existent).
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS renter_birthplace         TEXT,
  ADD COLUMN IF NOT EXISTS renter_id_card_nr         TEXT,
  ADD COLUMN IF NOT EXISTS renter_id_card_authority  TEXT,
  ADD COLUMN IF NOT EXISTS renter_license_issued     TEXT,
  ADD COLUMN IF NOT EXISTS renter_iban               TEXT,
  ADD COLUMN IF NOT EXISTS renter_bank_holder        TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_color             TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_fin               TEXT,
  ADD COLUMN IF NOT EXISTS weekly_rate               DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS monthly_rate              DECIMAL(10,2);

-- Match-Index für den FS-Nr-Lookup (ensure-customer Einzel-Lookup)
CREATE INDEX IF NOT EXISTS idx_customers_license ON customers(org_id, license_nr);
```

- [ ] **Step 2: TypeScript-Typen ergänzen** in `src/lib/types.ts` — `Customer` um `birth_place, id_card_authority, license_issued, iban, bank_holder, bic`; `Contract` um die 10 neuen Spalten. (Suche die bestehenden Interfaces, ergänze die Felder als `… | null`.)

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/065_contract_data_takeover.sql src/lib/types.ts
git commit -m "feat(db): Migration 065 — Stammdatenfelder customers/contracts für Vertrags-Übernahme"
```

---

### Task 2: Reine Logik-Schicht `contract-takeover.ts` (TDD)

**Files:**
- Create: `src/lib/contract-takeover.ts`
- Test: `src/lib/contract-takeover.test.ts`
- Modify: `src/lib/csv-import.ts` (normalizeDate exportieren)

Verantwortung: KEIN DB-Zugriff. Nur Vertrag-Row → normalisierte Kunden-/Match-Daten.

- [ ] **Step 1: `normalizeDate` aus csv-import.ts exportieren** (Zeile ~137: `const normalizeDate` → `export const normalizeDate`). Wird hier wiederverwendet (DRY).

- [ ] **Step 2: Failing tests schreiben** (`contract-takeover.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import {
  splitName, isCompanyName, parseAddress, normalizeLicenseNr,
  buildCustomerFromContract, matchCustomerId,
} from "./contract-takeover";

describe("splitName", () => {
  it("trennt Vor-/Nachname", () => {
    expect(splitName("Max Mustermann")).toEqual({ first: "Max", last: "Mustermann" });
    expect(splitName("Anna Maria Schmidt")).toEqual({ first: "Anna Maria", last: "Schmidt" });
  });
  it("Einzelwort → last", () => {
    expect(splitName("Mustermann")).toEqual({ first: "", last: "Mustermann" });
  });
});

describe("isCompanyName", () => {
  it("erkennt Firmen", () => {
    expect(isCompanyName("LEVRA SERVICE GmbH")).toBe(true);
    expect(isCompanyName("Krause Bau e.K.")).toBe(true);
    expect(isCompanyName("Max Mustermann")).toBe(false);
  });
});

describe("parseAddress", () => {
  it("parst Straße Hausnr, PLZ Ort", () => {
    expect(parseAddress("Hauptstraße 12, 80331 München")).toEqual({
      street: "Hauptstraße", house_nr: "12", zip: "80331", city: "München",
    });
  });
  it("Fallback: alles in street", () => {
    expect(parseAddress("irgendwas unstrukturiert")).toEqual({
      street: "irgendwas unstrukturiert", house_nr: null, zip: null, city: null,
    });
  });
});

describe("buildCustomerFromContract", () => {
  it("Privatkunde: Name/Adresse/Datum normalisiert", () => {
    const c = buildCustomerFromContract({
      renter_name: "Max Mustermann",
      renter_address: "Hauptstraße 12, 80331 München",
      renter_birthday: "14.05.1988",
      renter_license_nr: "b072 rre2 i55",
    } as any);
    expect(c.customer_type).toBe("privat");
    expect(c.first_name).toBe("Max");
    expect(c.last_name).toBe("Mustermann");
    expect(c.zip).toBe("80331");
    expect(c.birthday).toBe("1988-05-14");
  });
  it("Firma: company_name gesetzt, last_name = Name", () => {
    const c = buildCustomerFromContract({ renter_name: "LEVRA SERVICE GmbH" } as any);
    expect(c.customer_type).toBe("firma");
    expect(c.company_name).toBe("LEVRA SERVICE GmbH");
    expect(c.last_name).toBe("LEVRA SERVICE GmbH");
  });
});

describe("matchCustomerId — FS → Name+Geburtstag → null", () => {
  const existing = [
    { id: "c1", license_nr: "B072RRE2I55", first_name: "Max", last_name: "Mustermann", birthday: "1988-05-14" },
    { id: "c2", license_nr: null, first_name: "Erika", last_name: "Beispiel", birthday: "1979-11-02" },
  ];
  it("Stufe 1: FS-Nr (normalisiert)", () => {
    expect(matchCustomerId({ license_nr: "b072 rre2 i55", name: "X Y", birthday: null }, existing)).toBe("c1");
  });
  it("Stufe 2: Name + Geburtstag", () => {
    expect(matchCustomerId({ license_nr: null, name: "Erika Beispiel", birthday: "02.11.1979" }, existing)).toBe("c2");
  });
  it("Stufe 3: nichts eindeutig → null", () => {
    expect(matchCustomerId({ license_nr: null, name: "Erika Beispiel", birthday: null }, existing)).toBe(null);
  });
});
```

- [ ] **Step 3: Tests laufen lassen → FAIL** (`npx vitest run src/lib/contract-takeover.test.ts`, erwartet: Modul/Funktionen fehlen).

- [ ] **Step 4: `contract-takeover.ts` implementieren**

```ts
import { normalizeDate } from "./csv-import";

const COMPANY_MARKERS = /\b(gmbh|ug|ag|kg|ohg|mbh|e\.?\s?k\.?|e\.?\s?v\.?|gbr|ltd|inc|service|logistik|transport|bau|handel)\b/i;

export const isCompanyName = (name: string): boolean =>
  COMPANY_MARKERS.test((name || "").trim());

export const splitName = (full: string): { first: string; last: string } => {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: "", last: parts[0] ?? "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
};

export const normalizeLicenseNr = (s: string | null | undefined): string | null => {
  const t = (s || "").toUpperCase().replace(/\s+/g, "").trim();
  return t || null;
};

export const parseAddress = (addr: string | null | undefined) => {
  const fallback = { street: (addr || "").trim() || null, house_nr: null, zip: null, city: null };
  if (!addr) return { street: null, house_nr: null, zip: null, city: null };
  // "Straße Hausnr, PLZ Ort"
  const m = addr.match(/^(.*?)\s+(\d+\s*[a-zA-Z]?)\s*,\s*(\d{4,5})\s+(.+)$/);
  if (!m) return fallback;
  return { street: m[1].trim(), house_nr: m[2].trim(), zip: m[3].trim(), city: m[4].trim() };
};

type ContractRow = {
  renter_name?: string | null; renter_email?: string | null; renter_phone?: string | null;
  renter_address?: string | null; renter_birthday?: string | null; renter_birthplace?: string | null;
  renter_license_nr?: string | null; renter_license_class?: string | null;
  renter_license_expiry?: string | null; renter_license_issued?: string | null;
  renter_id_card_nr?: string | null; renter_id_card_authority?: string | null;
  renter_iban?: string | null; renter_bank_holder?: string | null;
};

// Normalisierter Kandidat für customers (fill-if-empty-Quelle).
export const buildCustomerFromContract = (c: ContractRow) => {
  const name = (c.renter_name || "").trim();
  const company = isCompanyName(name);
  const { first, last } = splitName(name);
  const addr = parseAddress(c.renter_address);
  return {
    customer_type: company ? "firma" : "privat",
    company_name: company ? name : null,
    first_name: company ? null : (first || null),
    last_name: company ? name : (last || name || null),
    email: (c.renter_email || "").trim().toLowerCase() || null,
    phone: c.renter_phone?.trim() || null,
    street: addr.street, house_nr: addr.house_nr, zip: addr.zip, city: addr.city,
    birthday: normalizeDate(c.renter_birthday || ""),
    birth_place: c.renter_birthplace?.trim() || null,
    license_nr: normalizeLicenseNr(c.renter_license_nr),
    license_class: c.renter_license_class?.trim() || null,
    license_expiry: normalizeDate(c.renter_license_expiry || ""),
    license_issued: normalizeDate(c.renter_license_issued || ""),
    id_card_nr: c.renter_id_card_nr?.trim() || null,
    id_card_authority: c.renter_id_card_authority?.trim() || null,
    iban: c.renter_iban?.replace(/\s+/g, "").toUpperCase() || null,
    bank_holder: c.renter_bank_holder?.trim() || null,
  };
};

type ExistingCustomer = {
  id: string; license_nr: string | null;
  first_name: string | null; last_name: string | null; birthday: string | null;
};

const nameKey = (first: string | null, last: string | null) =>
  `${(first || "").trim().toLowerCase()} ${(last || "").trim().toLowerCase()}`.trim();

// Stufe 1: FS-Nr; Stufe 2: Name+Geburtstag (ISO); sonst null.
export const matchCustomerId = (
  q: { license_nr: string | null; name: string | null; birthday: string | null },
  existing: ExistingCustomer[]
): string | null => {
  const lic = normalizeLicenseNr(q.license_nr);
  if (lic) {
    const hit = existing.find((e) => normalizeLicenseNr(e.license_nr) === lic);
    if (hit) return hit.id;
  }
  const bday = normalizeDate(q.birthday || "");
  const { first, last } = splitName(q.name || "");
  const key = nameKey(first, last);
  if (bday && key) {
    const hit = existing.find(
      (e) => normalizeDate(e.birthday || "") === bday && nameKey(e.first_name, e.last_name) === key
    );
    if (hit) return hit.id;
  }
  return null;
};
```

- [ ] **Step 5: Tests laufen lassen → PASS** (`npx vitest run src/lib/contract-takeover.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/contract-takeover.ts src/lib/contract-takeover.test.ts src/lib/csv-import.ts
git commit -m "feat(lib): reine Vertrags-Übernahme-Logik (Match FS→Name+Geb, Namens-/Adress-/Datums-Normalisierung)"
```

---

### Task 3: Fahrzeug-Backfill um neue Felder erweitern (TDD)

**Files:**
- Modify: `src/lib/vehicle.ts` (`buildVehicleBackfillFromContracts`, `ContractBackfillInput`, `VehicleBackfillInput`)
- Test: `src/lib/vehicle.test.ts`

- [ ] **Step 1: Failing tests** ergänzen in `vehicle.test.ts`: (a) `color/fin_number/weekly_rate/monthly_rate` werden aus dem **jüngsten** Vertrag mit Wert befüllt (fill-if-empty); (b) **Regression**: `km_at_intake` bleibt **ältester** Vertrag.

- [ ] **Step 2: Tests → FAIL**.

- [ ] **Step 3: Implementieren**: `ContractBackfillInput` um `color?, vehicle_fin?, weekly_rate?, monthly_rate?`; `VehicleBackfillInput` um `color?, fin_number?, weekly_rate?, monthly_rate?`. Im Funktionskörper analog zu `daily_rate` (first-wins = jüngster) je Feld ergänzen. `km_at_intake`-Block (`.reverse()`) UNVERÄNDERT lassen.

- [ ] **Step 4: Tests → PASS** (`npx vitest run src/lib/vehicle.test.ts`).

- [ ] **Step 5: Commit** `feat(vehicle): Backfill um Farbe/FIN/Wochen-/Monatsmiete (jüngster gewinnt), km_at_intake unverändert`

---

## Chunk 2: DB-Service + Verdrahtung aller Eintrittspunkte

### Task 4: Übernahme-Service `applyTakeover`

**Files:**
- Create: `src/lib/contract-takeover-service.ts`

Verantwortung: DB-Seiteneffekte. Signatur:
`applyTakeover(admin: SupabaseClient, orgId: string, contractIds: string[]): Promise<void>`

- [ ] **Step 1: Implementieren** (Ablauf):
  1. Verträge per `id IN contractIds` + `eq(org_id, orgId)` laden (alle relevanten Felder), sortiert `pickup_date DESC`.
  2. Bestehende Kunden der Org einmal laden (`id, license_nr, first_name, last_name, birthday` + alle fill-Zielfelder).
  3. In-Memory-Index + `newlyCreated`-Map (Key = FS-Nr bzw. name+bday) für Within-Batch-Dedup.
  4. Pro Vertrag: `buildCustomerFromContract` → `matchCustomerId` gegen (existing ∪ newlyCreated). Treffer → `fillEmpty`-Patch nur leere Felder, `update customers`. Kein Treffer → `insert customers` (last_name Pflicht: fallback "Mieter"). `update contracts set customer_id`.
  5. Fahrzeuge: betroffene Kennzeichen sammeln, je Fahrzeug laden, `buildVehicleBackfillFromContracts(vehicle, dessenVerträge DESC)` → `update vehicles` wenn Patch nicht leer.
  6. ALLES org-scoped (`.eq("org_id", orgId)` auf jedem Read/Write).
  - `fillEmpty(target, candidate)`: kleiner generischer Helper (nur Keys setzen, wo target leer/null und candidate non-null). In `contract-takeover.ts` ergänzen + Unit-Test.

- [ ] **Step 2: Unit-Test für `fillEmpty`** (in contract-takeover.test.ts), Tests → PASS.

- [ ] **Step 3: tsc** (`npx tsc --noEmit`) → 0 Fehler.

- [ ] **Step 4: Commit** `feat(lib): applyTakeover-Service (Kunde/Fahrzeug anlegen+abgleichen, org-scoped, Batch)`

---

### Task 5: Alle 4 Insert-Stellen verdrahten

**Files (je: nach dem contracts-Insert die neuen IDs sammeln und `applyTakeover` aufrufen):**
- Modify: `src/app/api/contracts/route.ts` (manuell + PDF-Form, Insert ~Z.257) — neue `renter_*`/`vehicle_*`/`weekly_rate`/`monthly_rate` aus `body` mit übernehmen.
- Modify: `src/app/api/contracts/import-csv/route.ts` (Insert-Schleife) — gesammelte IDs nach der Schleife.
- Modify: `src/app/api/contracts/import/route.ts` (Legacy, Bulk-Insert ~Z.153).
- Modify: `src/app/api/vehicles/[id]/successor/route.ts` (Insert ~Z.197).

- [ ] **Step 1–4:** je Datei: Insert um `.select("id")` erweitern (wo nicht vorhanden), IDs sammeln, am Ende `await applyTakeover(admin, org_id, ids)` in `try/catch` (Fehler dort dürfen den Vertrags-Insert NICHT zurückrollen — nur loggen). tsc nach jeder Datei.

- [ ] **Step 5: Commit** `feat(contracts): Kunden/Fahrzeug-Übernahme an allen 4 Insert-Pfaden auslösen`

---

### Task 6: `ensure-customer` auf gemeinsames Matching umstellen

**Files:**
- Modify: `src/app/api/contracts/[id]/ensure-customer/route.ts`

- [ ] **Step 1:** Lokales `splitName` entfernen, aus `contract-takeover` importieren. Matching-Reihenfolge: `matchCustomerId` (FS → Name+Geb), DANN bisheriger E-Mail-Match als Fallback, sonst anlegen via `buildCustomerFromContract`. Rückgabe-Shape `{ ok, customer_id, created }` und Idempotenz-Early-Return **unverändert**.
- [ ] **Step 2: tsc** + manuell prüfen, dass `ContractActions.tsx` weiter kompiliert.
- [ ] **Step 3: Commit** `refactor(contracts): ensure-customer nutzt gemeinsames FS→Name+Geb-Matching (E-Mail bleibt Fallback)`

---

### Task 7: Bestands-Backfill-Route

**Files:**
- Create: `src/app/api/contracts/backfill-takeover/route.ts`
- Modify: `src/app/dashboard/contracts/ContractsList.tsx` (Button „Kunden & Fahrzeuge aus Verträgen anlegen")

- [ ] **Step 1:** Route nach Muster von `backfill-from-contracts/route.ts`: `requireAuth`, `maxDuration = 60`. Lädt org-scoped alle Vertrags-IDs ohne `customer_id` seitenweise (range-Pagination), ruft `applyTakeover(admin, org_id, idsBatch)` blockweise. Antwort: `{ ok, processed }`. Idempotent.
- [ ] **Step 2:** Button + `fetch` + Toast/Refresh in der Vertragsliste (analog vorhandener Aktionen).
- [ ] **Step 3: tsc/lint**, Commit `feat(contracts): Bestands-Backfill-Route + Button (Kunden/Fahrzeuge nachziehen)`

---

## Chunk 3: Datenfluss-Oberflächen

### Task 8: CSV-Import — neue Felder

**Files:**
- Modify: `src/lib/csv-import.ts` (`CONTRACT_FIELDS`, `DATE_KEYS`, `NUMBER_KEYS`)
- Modify: `src/app/api/contracts/import-csv/route.ts` (baseRow)
- Test: `src/lib/csv-import.test.ts`

- [ ] **Step 1: Failing test** für Normalisierung neuer Keys (`renter_iban`, `weekly_rate`→Zahl, `renter_license_issued`→Datum).
- [ ] **Step 2:** `CONTRACT_FIELDS` um die 10 neuen Felder erweitern (deutsche Labels), `weekly_rate/monthly_rate` in `NUMBER_KEYS`, `renter_license_issued` in `DATE_KEYS`; `baseRow` um die Felder. Test → PASS.
- [ ] **Step 3: Commit** `feat(csv): Vertrags-Import um Stammdaten-/Fahrzeugfelder erweitern`

---

### Task 9: KI-Parser — neue Felder extrahieren

**Files:**
- Modify: `src/lib/anthropic.ts` (`CONTRACT_PROMPT`, `ParsedContractData`-Typ; ggf. `CUSTOMER_PROMPT` um Geburtsort/Ausweisbehörde)

- [ ] **Step 1:** Prompt-JSON um `renter_birthplace, renter_id_card_nr, renter_id_card_authority, renter_license_issued, renter_iban, renter_bank_holder, vehicle_color, vehicle_fin, weekly_rate, monthly_rate` erweitern (deutsche Feldhinweise, Datum strikt `YYYY-MM-DD`, null wenn nicht erkennbar). Typ entsprechend erweitern.
- [ ] **Step 2:** `parse/route.ts`/Form: sicherstellen, dass die geparsten Felder ins `body` an `POST /api/contracts` gelangen (Task 5 verarbeitet sie).
- [ ] **Step 3: tsc**, Commit `feat(ai): Vertrags-Parser extrahiert Geburtsort/Ausweis/Bank/Farbe/FIN/Wochen-Monatsmiete`

---

### Task 10: Manuelles Vertrags-Formular — neue Eingabefelder

**Files:**
- Modify: `src/app/dashboard/contracts/new/NewContractClient.tsx`
- Modify: `src/app/api/contracts/route.ts` (body→insert für die neuen Felder; teils in Task 5 erledigt)

- [ ] **Step 1:** Eingabefelder für die neuen Mieter-/Fahrzeugfelder ergänzen (gruppiert, bestehende Feld-Komponenten/Stil wiederverwenden). Optional, kein Pflichtfeld.
- [ ] **Step 2: tsc/lint**, Commit `feat(contracts): Formularfelder für Geburtsort/Ausweis/Bank/Fahrzeug-Stammdaten`

---

### Task 11: Fahrzeug-Archiv — Limit aufheben

**Files:**
- Modify: `src/app/dashboard/vehicles/[id]/page.tsx` (~Z.88 `.limit(50)`)

- [ ] **Step 1:** `.limit(50)` der Vertrags-Historie durch range-Pagination ersetzen (Muster wie `contracts/page.tsx`), Sortierung `pickup_date DESC` (neueste zuerst). Safety-Cap analog.
- [ ] **Step 2: tsc/lint/build**, Commit `fix(vehicles): Vertrags-Archiv zeigt ALLE Verträge des Fahrzeugs (Limit 50 raus)`

---

## Abschluss
- [ ] `npx tsc --noEmit` → 0, `npx vitest run` → alle grün, `npm run build` → grün, `npx next lint` → clean.
- [ ] Manueller Smoke-Test mit `test-data/altvertraege-test.csv`: Import → Kunden angelegt, Fahrzeuge befüllt, Archiv vollständig.
- [ ] PR gegen `main`.
