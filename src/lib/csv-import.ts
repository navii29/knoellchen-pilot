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
  { key: "category", label: "Kategorie" },
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
];

// =========================================================
// Wert-Normalisierung pro Feldtyp
// =========================================================
const normalizeDate = (v: string): string | null => {
  const t = v.trim();
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // dd.mm.yyyy oder dd/mm/yyyy
  const m = t.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (m) {
    const [, d, mm, y] = m;
    const yyyy = y.length === 2 ? `20${y}` : y;
    return `${yyyy}-${mm.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
};

const normalizeNumber = (v: string): number | null => {
  const t = v.trim().replace(/\./g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
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
]);
const INT_KEYS = new Set([
  "power_ps",
  "seats",
  "luggage",
  "km_at_intake",
  "max_km_total",
  "inclusive_km_month",
]);
const DATE_KEYS = new Set([
  "birthday",
  "license_expiry",
  "first_registration",
  "available_from",
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
