import Papa from "papaparse";

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
};

// Robust gegen ; , \t + UTF-8/Latin-1, leere Zeilen werden geskippt.
export const parseCsvText = (text: string): CsvParseResult => {
  const trimmed = text.replace(/^﻿/, ""); // BOM
  const result = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    delimitersToGuess: [";", ",", "\t", "|"],
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  const rows = (result.data ?? []).filter((r) =>
    Object.values(r).some((v) => typeof v === "string" && v.trim() !== "")
  );
  return { headers, rows, rowCount: rows.length };
};

export type ColumnMapping = Record<string, string | null>;
//   csv-header  →  ziel-feld (oder null = ignorieren)

export type FieldDef = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
};

export const CUSTOMER_FIELDS: FieldDef[] = [
  { key: "customer_type", label: "Kundentyp", hint: "privat / firma" },
  { key: "company_name", label: "Firmenname", hint: "bei Firmenkunden" },
  { key: "legal_form", label: "Rechtsform", hint: "GmbH, UG, AG" },
  { key: "salutation", label: "Anrede", hint: "Herr, Frau" },
  { key: "title", label: "Titel", hint: "Dr., Prof." },
  { key: "first_name", label: "Vorname" },
  { key: "last_name", label: "Nachname", required: true },
  { key: "birthday", label: "Geburtsdatum", hint: "YYYY-MM-DD" },
  { key: "street", label: "Straße" },
  { key: "house_nr", label: "Hausnummer" },
  { key: "zip", label: "PLZ" },
  { key: "city", label: "Ort" },
  { key: "country", label: "Land" },
  { key: "email", label: "E-Mail" },
  { key: "phone", label: "Telefon" },
  { key: "license_nr", label: "Führerschein-Nr." },
  { key: "license_class", label: "Führerschein-Klasse" },
  { key: "license_expiry", label: "Führerschein gültig bis", hint: "YYYY-MM-DD" },
  { key: "id_card_nr", label: "Ausweis-Nr." },
  { key: "notes", label: "Notizen" },
];

export const VEHICLE_FIELDS: FieldDef[] = [
  { key: "plate", label: "Kennzeichen", required: true },
  { key: "manufacturer", label: "Hersteller" },
  { key: "model", label: "Modell" },
  { key: "color", label: "Farbe" },
  { key: "first_registration", label: "Erstzulassung", hint: "YYYY-MM-DD" },
  { key: "fuel_type", label: "Kraftstoff" },
  { key: "transmission", label: "Getriebe" },
  { key: "doors", label: "Türen" },
  { key: "seats", label: "Sitzplätze" },
  { key: "luggage", label: "Gepäckstücke" },
  { key: "body_type", label: "Karosserie" },
  { key: "fin_number", label: "FIN" },
  { key: "category", label: "Geschäftslinie" },
  { key: "power_ps", label: "Leistung (PS)" },
  { key: "daily_rate", label: "Tagespreis (€)" },
  { key: "base_daily_rate", label: "Basispreis (€)" },
  { key: "weekly_rate", label: "Wochenpreis (€)" },
  { key: "monthly_rate", label: "Monatspreis (€)" },
  { key: "deposit", label: "Kaution (€)" },
  { key: "extra_km_price", label: "Mehr-km-Preis (€)" },
  { key: "km_at_intake", label: "Km bei Einflottung" },
  { key: "max_km_total", label: "Max. km gesamt" },
  { key: "inclusive_km_month", label: "Inkl. km / Monat" },
  { key: "available_from", label: "Verfügbar ab", hint: "YYYY-MM-DD" },
  { key: "accessories", label: "Zubehör" },
  { key: "echoes_device_id", label: "Echoes-Tracker-ID" },
  // EK-/Kostenfelder (nur Inhaber — der Import filtert sie für Mitarbeiter raus)
  { key: "cost_monthly", label: "Monatliche Kosten / Leasing (EK, €)" },
  { key: "cost_daily", label: "Tägliche Kosten (EK, €)" },
  { key: "target_daily_rate", label: "Soll-Tagespreis (€)" },
  { key: "onetime_cost_supplier", label: "Einmalkosten Lieferant (€)" },
  { key: "onetime_cost_pickup", label: "Kosten Abholung (€)" },
  { key: "onetime_cost_return", label: "Kosten Rückverbringung (€)" },
];

// Mietverträge. Bewusst OHNE Partner-/Margenfelder (die bleiben Inhaber-only und
// werden nicht per CSV gesetzt). Preise hier sind Verkaufspreise (Tagespreis,
// Gesamtbetrag, Kaution), keine EK-Kosten.
export const CONTRACT_FIELDS: FieldDef[] = [
  { key: "contract_nr", label: "Vertragsnummer", hint: "leer = automatisch" },
  { key: "plate", label: "Kennzeichen", required: true },
  { key: "vehicle_type", label: "Fahrzeug" },
  { key: "renter_name", label: "Mietername", required: true },
  { key: "renter_email", label: "E-Mail" },
  { key: "renter_phone", label: "Telefon" },
  { key: "renter_address", label: "Adresse" },
  { key: "renter_birthday", label: "Geburtsdatum", hint: "YYYY-MM-DD" },
  { key: "renter_license_nr", label: "Führerschein-Nr." },
  { key: "renter_license_class", label: "Führerschein-Klasse" },
  { key: "renter_license_expiry", label: "FS gültig bis", hint: "YYYY-MM-DD" },
  { key: "pickup_date", label: "Abholdatum", required: true, hint: "YYYY-MM-DD" },
  { key: "return_date", label: "Rückgabedatum", required: true, hint: "YYYY-MM-DD" },
  { key: "pickup_time", label: "Abholzeit" },
  { key: "return_time", label: "Rückgabezeit" },
  { key: "daily_rate", label: "Tagespreis (€)" },
  { key: "total_amount", label: "Gesamtbetrag (€)" },
  { key: "deposit", label: "Kaution (€)" },
  { key: "km_pickup", label: "Km bei Abholung" },
  { key: "km_return", label: "Km bei Rückgabe" },
  { key: "km_limit", label: "Km-Limit" },
  // Erweiterte Mieter-Stammdaten (Migration 065) — fließen in die Kunden-Übernahme.
  { key: "renter_birthplace", label: "Geburtsort" },
  { key: "renter_id_card_nr", label: "Ausweisnummer" },
  { key: "renter_id_card_authority", label: "Ausweis ausstellende Behörde" },
  { key: "renter_license_issued", label: "Führerschein Ausstellungsdatum", hint: "YYYY-MM-DD" },
  { key: "renter_iban", label: "IBAN" },
  { key: "renter_bank_holder", label: "Kontoinhaber" },
  // Fahrzeug-Stammdaten (fürs Fahrzeug-Backfill).
  { key: "vehicle_color", label: "Fahrzeugfarbe" },
  { key: "vehicle_fin", label: "FIN" },
  { key: "weekly_rate", label: "Wochenmiete (€)" },
  { key: "monthly_rate", label: "Monatsmiete (€)" },
  { key: "status", label: "Status", hint: "aktiv, abgeschlossen, storniert" },
  { key: "notes", label: "Notizen" },
];

// =========================================================
// Wert-Normalisierung pro Feldtyp
// =========================================================
// Echtes Kalenderdatum? (verhindert, dass z. B. 31.02. als '2020-02-31' an die
// DB geht und den ganzen Import-Batch mit einem Datums-Fehler kippt).
const isRealIsoDate = (iso: string): boolean => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
};

export const normalizeDate = (v: string): string | null => {
  const t = v.trim();
  if (!t) return null;
  let iso: string | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    iso = t;
  } else {
    // dd.mm.yyyy oder dd/mm/yyyy
    const m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
    if (m) {
      const [, d, mm, y] = m;
      const yyyy = y.length === 2 ? `20${y}` : y;
      iso = `${yyyy}-${mm.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
  }
  // Ungültiges Datum lieber verwerfen (null) als den Batch-Insert crashen lassen.
  return iso && isRealIsoDate(iso) ? iso : null;
};

// Zahl robust parsen — erkennt Punkt- UND Komma-Dezimaltrenner. Das blinde
// Entfernen ALLER Punkte (Annahme: Tausender) verfälschte Punkt-Dezimalwerte
// ("0.35" -> 35) und zerstörte u. a. Mehr-km-Preis/EK-Kosten beim Export->Import.
const normalizeNumber = (v: string): number | null => {
  let t = v.trim().replace(/[^0-9.,-]/g, "");
  if (!t) return null;
  const neg = t.startsWith("-");
  t = t.replace(/-/g, "");
  const hasComma = t.includes(",");
  const hasDot = t.includes(".");
  let s: string;
  if (hasComma && hasDot) {
    // Der zuletzt stehende Trenner ist der Dezimaltrenner, der andere Tausender.
    s =
      t.lastIndexOf(",") > t.lastIndexOf(".")
        ? t.replace(/\./g, "").replace(",", ".") // de: 1.234,56
        : t.replace(/,/g, ""); // en: 1,234.56
  } else if (hasComma) {
    // Nur Komma -> Dezimaltrenner (deutsche Konvention); bei mehreren nur das letzte.
    const parts = t.split(",");
    s =
      parts.length > 2
        ? parts.slice(0, -1).join("") + "." + parts[parts.length - 1]
        : t.replace(",", ".");
  } else if (hasDot) {
    const dots = t.split(".").length - 1;
    if (dots > 1) {
      s = t.replace(/\./g, ""); // 1.234.567 -> Tausender
    } else if (/^0\./.test(t)) {
      // Führende Null vor dem Punkt => IMMER Dezimalpunkt, nie Tausender:
      // "0.350" ist 0,35 — nicht 350. (Die 3-Nachkommastellen-Heuristik unten
      // würde solche Preiswerte sonst verfälschen.)
      // HINWEIS: Preisfelder (z. B. extra_km_price) sollten idealerweise einen
      // dezimal-strikten Parser nutzen; diese Regel ist ein minimaler Guard.
      s = t;
    } else {
      const after = t.slice(t.indexOf(".") + 1);
      // Genau 3 Nachkommastellen => Tausender (de "1.234"); sonst Dezimalpunkt.
      s = after.length === 3 ? t.replace(".", "") : t;
    }
  } else {
    s = t;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
};

const normalizeInt = (v: string): number | null => {
  const n = normalizeNumber(v);
  return n == null ? null : Math.round(n);
};

const NUMBER_KEYS = new Set([
  "daily_rate",
  "base_daily_rate",
  "weekly_rate",
  "monthly_rate",
  "deposit",
  "extra_km_price",
  "cost_monthly",
  "cost_daily",
  "target_daily_rate",
  "onetime_cost_supplier",
  "onetime_cost_pickup",
  "onetime_cost_return",
  // Vertrags-Import
  "total_amount",
]);

// EK-/Kostenfelder — nur Inhaber dürfen sie via CSV importieren.
export const VEHICLE_COST_KEYS = new Set([
  "cost_monthly",
  "cost_daily",
  "target_daily_rate",
  "onetime_cost_supplier",
  "onetime_cost_pickup",
  "onetime_cost_return",
]);
const INT_KEYS = new Set([
  "power_ps",
  "seats",
  "luggage",
  "km_at_intake",
  "max_km_total",
  "inclusive_km_month",
  // Vertrags-Import
  "km_pickup",
  "km_return",
  "km_limit",
]);
const DATE_KEYS = new Set([
  "birthday",
  "license_expiry",
  "first_registration",
  "available_from",
  // Vertrags-Import
  "pickup_date",
  "return_date",
  "renter_birthday",
  "renter_license_expiry",
  "renter_license_issued",
]);

export const normalizeValue = (key: string, raw: string): unknown => {
  const t = (raw ?? "").trim();
  if (!t) return null;
  if (DATE_KEYS.has(key)) return normalizeDate(t);
  if (NUMBER_KEYS.has(key)) return normalizeNumber(t);
  if (INT_KEYS.has(key)) return normalizeInt(t);
  return t;
};

// =========================================================
// Mapping anwenden: aus row + mapping → DB-Row
// =========================================================
export const applyMapping = (
  row: Record<string, string>,
  mapping: ColumnMapping
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [csvHeader, fieldKey] of Object.entries(mapping)) {
    if (!fieldKey) continue;
    const raw = row[csvHeader];
    if (raw === undefined) continue;
    const v = normalizeValue(fieldKey, String(raw));
    // Spezialfall: mehrere CSV-Spalten könnten auf dasselbe Feld mappen
    // (z. B. "Vorname" + "Nachname" → wir lassen den späteren gewinnen,
    // außer name-bzogene Felder die zusammengesetzt werden — das überlassen
    // wir dem KI-Mapping, hier kein Auto-Concat).
    if (v != null) out[fieldKey] = v;
  }
  return out;
};
