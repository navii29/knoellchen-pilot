# Datenübernahme aus Verträgen — Kunden & Fahrzeuge automatisch anlegen/abgleichen

**Datum:** 2026-06-25
**Status:** Design genehmigt (User: „passt"), Implementierung ausstehend

## 1. Ziel

Beim Anlegen/Importieren eines Mietvertrags (insb. Altverträge) sollen die im
Vertrag enthaltenen Kunden- und Fahrzeugdaten automatisch in die zentralen
Stammdaten-Tabellen `customers` und `vehicles` übernommen werden — anlegen,
abgleichen (Duplikatprüfung), und fehlende Felder beidseitig ergänzen. Pro
Fahrzeug entsteht ein vollständiges Archiv aller zugehörigen Verträge.

Stammdaten müssen so nicht mehr manuell nachgepflegt werden.

## 2. Geltungsbereich (Eintrittspunkte)

Die Übernahme läuft an **allen** Wegen, auf denen ein Vertrag entsteht:

| Pfad | Datei | Änderung |
|------|-------|----------|
| CSV-Import (KI-Mapping) | `src/app/api/contracts/import-csv/route.ts` | erweitern |
| CSV-Import (Legacy/Alias) | `src/app/api/contracts/import/route.ts` | erweitern |
| PDF/Foto-Vertrag (KI-Parse) | `src/app/api/contracts/parse/route.ts` + `parseContractImage` | erweitern |
| Manueller „Neuer Vertrag" | `src/app/api/contracts/route.ts` | erweitern |
| Anschluss-/Nachfolgevertrag | `src/app/api/vehicles/[id]/successor/route.ts` | erweitern |
| Bestand (bereits importierte Verträge) | neue Backfill-Route | neu |

**Wichtig:** Es gibt ZWEI CSV-Importer (`import-csv` mit KI-Mapping, `import`
als Legacy-Alias-Importer) — beide müssen die Übernahme auslösen. Der
Successor-Pfad erzeugt ebenfalls einen vollständigen Vertrag mit Mieter-Snapshot
und ist daher im Geltungsbereich. `extension/route.ts` und Portal-Verlängerung
erzeugen KEINEN neuen Vertrag (nur UPDATE bzw. `contract_extensions`) → nicht
relevant.

Konsequenz: Alle Pfade rufen denselben Service (§5.1) auf. Kein Insert-in-
`contracts` ohne anschließende Übernahme.

## 3. Nicht im Geltungsbereich (YAGNI)

- Keine separate Bankkonten-Tabelle (Bank-Felder kommen flach auf `customers`).
- Keine Foto-/Dokument-Uploads im Rahmen dieses Features (bestehende Pfade
  bleiben unberührt).
- Keine Veränderung der bestehenden Fahrzeug-Backfill-Trigger-Mechanik (Auto-
  Backfill beim Öffnen der Fahrzeugseite bleibt); sie wird nur um neue Felder
  erweitert.

## 4. Schema-Ausbau

### 4.1 `customers` — neue Spalten
| Spalte | Typ | Bedeutung |
|--------|-----|-----------|
| `birth_place` | TEXT | Geburtsort |
| `id_card_authority` | TEXT | Ausstellende Behörde Personalausweis |
| `license_issued` | DATE | Führerschein-Ausstellungsdatum |
| `iban` | TEXT | Bankverbindung |
| `bank_holder` | TEXT | Kontoinhaber |
| `bic` | TEXT | BIC (optional) |

Bereits vorhanden und wiederverwendet: `salutation, title, first_name,
last_name, birthday, street, house_nr, zip, city, country, email, phone,
license_nr, license_class, license_expiry, id_card_nr, customer_type,
company_name, legal_form`.

### 4.2 `contracts` — neue Spalten (Vertrag trägt den vollen Kundendatensatz)
| Spalte | Typ | Quelle/Ziel |
|--------|-----|-------------|
| `renter_birthplace` | TEXT | → customer.birth_place |
| `renter_id_card_nr` | TEXT | → customer.id_card_nr |
| `renter_id_card_authority` | TEXT | → customer.id_card_authority |
| `renter_license_issued` | TEXT | → customer.license_issued (DATE, normalisiert) |
| `renter_iban` | TEXT | → customer.iban |
| `renter_bank_holder` | TEXT | → customer.bank_holder |
| `vehicle_color` | TEXT | → vehicle.color |
| `vehicle_fin` | TEXT | → vehicle.fin_number |
| `weekly_rate` | DECIMAL(10,2) | → vehicle.weekly_rate |
| `monthly_rate` | DECIMAL(10,2) | → vehicle.monthly_rate |

**Typ-Hinweis:** Mieter-Datumsfelder werden auf `contracts` als TEXT geführt
(konsistent mit dem bestehenden `renter_birthday`/`renter_license_expiry` TEXT,
001:20,23) und erst beim Schreiben in die DATE-Spalten von `customers`
normalisiert (§5.6). `weekly_rate`/`monthly_rate` werden NUR zu `contracts`
hinzugefügt — auf `vehicles` existieren sie bereits (009:28-29).

Bereits vorhanden: `renter_name, renter_email, renter_phone, renter_address,
renter_birthday, renter_license_nr, renter_license_class, renter_license_expiry,
customer_id, vehicle_id, plate, vehicle_type, daily_rate, deposit, km_pickup,
km_return, km_limit`.

Migrationen liegen unter `supabase/migrations/` (nächste freie Nummer).

## 5. Kern-Logik

### 5.1 Gemeinsame Funktion
Eine reine, testbare Funktion bildet einen Vertrags-Datensatz auf Kunden- und
Fahrzeug-Patches ab. Die DB-Seiteneffekte (Lesen vorhandener Kunden, Insert/
Update, Verknüpfung) liegen in einem dünnen Service-Layer darüber, damit die
Logik ohne DB unit-testbar bleibt.

```
applyContractToCustomerAndVehicle(contract, { existingCustomers, existingVehicle })
  → { customerMatch, customerPatch, vehiclePatch, customerIdToLink }
```

### 5.2 Kunden-Duplikatprüfung (vom User bestätigt)
1. **Führerschein-Nr** (normalisiert, org-weit) gleich → selber Kunde.
2. sonst **Name + Geburtsdatum** (normalisiert) gleich → selber Kunde.
3. sonst → **neuer Kunde**.

Kein Matching allein über den Namen (Falsch-Verschmelzung vermeiden).
Innerhalb eines Imports werden gleiche Kunden zu EINEM zusammengeführt.

Normalisierung VOR dem Vergleich (§5.6): FS-Nr getrimmt/uppercase ohne
Leerzeichen; Geburtsdatum zu ISO `YYYY-MM-DD` (sonst gilt Stufe 2 als nicht
erfüllt); Name lowercase/getrimmt. Heterogene TEXT-Formate dürfen nicht zu
Falsch-Negativen führen.

### 5.3 Fahrzeug-Abgleich
Über das Kennzeichen (`UNIQUE(org_id, plate)` — bereits vorhanden). Fahrzeug
wird angelegt, falls nicht vorhanden.

### 5.4 Beidseitiges fill-if-empty
- Fehlt beim (auch bereits existierenden) **Kunden** ein Feld, das der Vertrag
  trägt → ergänzen.
- Fehlt beim **Fahrzeug** ein Feld, das der Vertrag trägt → ergänzen.
- **Nie überschreiben.** Bestehende, manuell gepflegte Werte gewinnen immer.
- Bei mehreren Verträgen pro Feld: **jüngster Vertrag** (nach `pickup_date`)
  gewinnt für das leere Feld — Aufrufer übergibt Verträge `pickup_date DESC`.
- **AUSNAHME (Regressionsschutz):** `km_at_intake` behält die bestehende
  „ältester Vertrag gewinnt"-Regel (`buildVehicleBackfillFromContracts`,
  vehicle.ts:298, `[...contracts].reverse()`). Die neu hinzukommenden
  Fahrzeugfelder `color`, `fin_number`, `weekly_rate`, `monthly_rate` folgen der
  Standard-Regel „jüngster gewinnt". Diese Unterscheidung MUSS beim Erweitern
  der Funktion erhalten bleiben (Test absichern).

### 5.5 Namens-/Adress-Aufteilung
- **Firma erkannt** (GmbH/UG/AG/e.K./„… Service" etc.) → `customer_type='firma'`,
  `company_name` = Name, `last_name` = Name. Kein Geburtstag/FS erwartet.
- **Privat** → letztes Wort = `last_name`, Rest = `first_name`
  (vorhandener `splitName`-Helper aus `ensure-customer`).
- **Adresse**: Best-Effort-Parse `Straße Hausnr, PLZ Ort`; schlägt das fehl,
  kommt alles in `street` (kein Datenverlust).

### 5.6 Datums-Normalisierung (verpflichtend)
`contracts.renter_birthday`/`renter_license_expiry`/`renter_license_issued` sind
TEXT und je nach Erzeugungspfad heterogen (`import-csv` normalisiert via
`normalizeDate`, `import/route.ts` schreibt roh, `ensure-customer` schiebt heute
ungeprüft in die DATE-Spalte → Insert-Fehler-Risiko). Daher:
- Eine zentrale Helper-Funktion parst zu ISO `YYYY-MM-DD` (akzeptiert
  `dd.mm.yyyy`, `dd/mm/yyyy`, `yyyy-mm-dd`), sonst `null` (Wiederverwendung der
  Logik aus `csv-import.ts`).
- **Vor** jedem Schreiben in eine `customers`-DATE-Spalte normalisieren
  (verhindert Insert-Fehler).
- **Vor** dem Geburtsdatum-Matching (§5.2 Stufe 2) normalisieren.
- Nicht-parsebare Werte blockieren nur das betroffene Feld, nie den ganzen
  Datensatz.

### 5.7 Erhalt des `ensure-customer`-Vertrags (kein Regressions-Bruch)
`POST /api/contracts/[id]/ensure-customer` wird in `ContractActions.tsx`
(Portalzugang + Self-Checkin-Link) genutzt. Beim Umbau auf den gemeinsamen
Service MUSS erhalten bleiben:
- Rückgabe-Shape `{ ok, customer_id, created }` (von der UI konsumiert).
- Idempotenz: Early-Return wenn `contract.customer_id` schon gesetzt.
- Der bisherige **E-Mail-Match** bleibt als zusätzliche Fallback-Stufe NACH
  FS-Nr und Name+Geburtstag erhalten (nicht ersatzlos entfernen).
- `splitName` wird aus der Route in das gemeinsame Modul ausgelagert; alle
  bisherigen Importe nachziehen.

## 6. Datenfluss durch die neuen Felder
- **Vertrags-Formular** (`NewContractClient`): neue Eingabefelder.
- **KI-Parser-Prompts** (`CONTRACT_PROMPT`, Kunden-Prompt in `anthropic.ts`):
  um Geburtsort, Ausweisbehörde, FS-Ausstellungsdatum, Bankdaten erweitern.
- **CSV-Import** (`CONTRACT_FIELDS` in `csv-import.ts`): neue Spalten + passende
  Normalisierungs-Sets (DATE/NUMBER/INT).
- **Fahrzeug-Backfill** (`buildVehicleBackfillFromContracts`): zusätzlich
  `color`, `fin_number`, `weekly_rate`, `monthly_rate`.

## 7. Archiv pro Fahrzeug
Vertrags-Historie auf `src/app/dashboard/vehicles/[id]/page.tsx`: hartes
`.limit(50)` entfernen (range-Pagination wie bei der Vertragsliste), Sortierung
**neueste zuerst**. So steht jeder Vertrag des Autos im Archiv.

## 8. Tests (vitest)
- Matching: FS-Nr → Name+Geburtstag → neu; keine Namens-only-Verschmelzung.
- Beidseitiges fill-if-empty (Kunde & Fahrzeug), „jüngster gewinnt".
- Namens-Split (privat) + Firma-Erkennung.
- Adress-Parse mit Fallback.
- Within-Batch-Dedup (zwei Verträge, ein Kunde).
- **Regressionstest:** `km_at_intake` bleibt „ältester gewinnt", während
  `color/fin/weekly_rate/monthly_rate` „jüngster gewinnt" folgen (§5.4).
- Datums-Normalisierung: `01.05.1990`/`1990-05-01`/Müll → ISO bzw. null; Matching
  auf Geburtsdatum trotz unterschiedlicher Eingabeformate.

## 9. Performance, Multi-Tenant & neue Backfill-Route
- **Batch-Matching:** Bestehende Kunden/Fahrzeuge pro Import **einmal** laden,
  im Speicher matchen, neue gebündelt anlegen — kein DB-Round-Trip pro Zeile.
- **Index:** Für den Einzel-Lookup in `ensure-customer` (FS-Nr) Index
  `customers(org_id, license_nr)` ergänzen (heute nur org/last_name/email,
  003:46-48). Für das In-Memory-Batch-Matching nicht kritisch, aber konsistent.
- **Multi-Tenant:** Die neue Bestands-Backfill-Route folgt exakt dem Muster von
  `backfill-from-contracts/route.ts` (`requireAuth` + `.eq("org_id", …)` auf
  ALLEN `customers`/`vehicles`/`contracts`-Reads, Inserts und Updates). Kein
  Schreibzugriff ohne org_id-Filter.
- **Timeout:** Die Bestands-Backfill-Route bekommt `maxDuration = 60` und
  verarbeitet Verträge seitenweise (range-Pagination), damit große Orgs nicht
  in den Timeout laufen; idempotent (nur Verträge ohne `customer_id` bzw. mit
  leeren Zielfeldern), wiederholbar.
- Bestehende `maxDuration = 60` und `MAX_ROWS`-Grenzen der Importer bleiben.

## 10. Annahmen / offene Punkte
- BIC ist optional (oft aus IBAN ableitbar) — wird mitgeführt, wenn vorhanden.
- Für Firmenkunden ohne FS/Geburtstag greift Stufe 1/2 des Matchings nicht;
  Abgleich erfolgt dann nicht automatisch (neuer Datensatz), um Falsch-
  Verschmelzung zu vermeiden. Akzeptiert.
