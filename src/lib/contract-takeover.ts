// Reine, DB-freie Logik für die Datenübernahme aus Verträgen: bildet einen
// Vertrags-Datensatz auf normalisierte Kunden-Felder + Match-Keys ab. Bewusst
// ohne Supabase-Zugriff, damit alles unit-testbar bleibt (siehe
// contract-takeover.test.ts). Die DB-Seiteneffekte liegen im Service
// contract-takeover-service.ts.
import { normalizeDate } from "./csv-import";

// Rechtsform-/Branchen-Marker, an denen wir einen Firmenmieter erkennen.
const COMPANY_MARKERS =
  /\b(gmbh|ug|ag|kg|ohg|mbh|e\.?\s?k\.?|e\.?\s?v\.?|gbr|ltd|inc|service|logistik|transport|bau|handel)\b/i;

export const isCompanyName = (name: string | null | undefined): boolean =>
  COMPANY_MARKERS.test((name || "").trim());

export const splitName = (full: string | null | undefined): { first: string; last: string } => {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: "", last: parts[0] ?? "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
};

export const normalizeLicenseNr = (s: string | null | undefined): string | null => {
  const t = (s || "").toUpperCase().replace(/\s+/g, "").trim();
  return t || null;
};

export const parseAddress = (
  addr: string | null | undefined
): { street: string | null; house_nr: string | null; zip: string | null; city: string | null } => {
  if (!addr || !addr.trim()) return { street: null, house_nr: null, zip: null, city: null };
  // "Straße Hausnr, PLZ Ort" — sonst alles in street (kein Datenverlust).
  const m = addr.match(/^(.*?)\s+(\d+\s*[a-zA-Z]?)\s*,\s*(\d{4,5})\s+(.+)$/);
  if (!m) return { street: addr.trim(), house_nr: null, zip: null, city: null };
  return { street: m[1].trim(), house_nr: m[2].trim(), zip: m[3].trim(), city: m[4].trim() };
};

export type ContractTakeoverRow = {
  renter_name?: string | null;
  renter_email?: string | null;
  renter_phone?: string | null;
  renter_address?: string | null;
  renter_birthday?: string | null;
  renter_birthplace?: string | null;
  renter_license_nr?: string | null;
  renter_license_class?: string | null;
  renter_license_expiry?: string | null;
  renter_license_issued?: string | null;
  renter_id_card_nr?: string | null;
  renter_id_card_authority?: string | null;
  renter_iban?: string | null;
  renter_bank_holder?: string | null;
};

// Normalisierter Kunden-Kandidat (Quelle für fill-if-empty). Datumsfelder sind
// hier bereits ISO (oder null) — sicher zum Schreiben in DATE-Spalten.
export const buildCustomerFromContract = (c: ContractTakeoverRow) => {
  const name = (c.renter_name || "").trim();
  const company = isCompanyName(name);
  const { first, last } = splitName(name);
  const addr = parseAddress(c.renter_address);
  return {
    customer_type: company ? "firma" : "privat",
    company_name: company ? name : null,
    first_name: company ? null : first || null,
    last_name: company ? name : last || name || null,
    email: (c.renter_email || "").trim().toLowerCase() || null,
    phone: c.renter_phone?.trim() || null,
    street: addr.street,
    house_nr: addr.house_nr,
    zip: addr.zip,
    city: addr.city,
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

export type ExistingCustomerKey = {
  id: string;
  license_nr: string | null;
  first_name: string | null;
  last_name: string | null;
  birthday: string | null;
};

const nameKey = (first: string | null, last: string | null) =>
  `${(first || "").trim().toLowerCase()} ${(last || "").trim().toLowerCase()}`.trim();

// Duplikatprüfung: ① Führerschein-Nr (normalisiert) → ② Name + Geburtsdatum
// (Format-tolerant via normalizeDate) → sonst null (kein Raten über Name allein).
export const matchCustomerId = (
  q: { license_nr: string | null; name: string | null; birthday: string | null },
  existing: ExistingCustomerKey[]
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

const isEmpty = (v: unknown): boolean =>
  v == null || (typeof v === "string" && v.trim() === "");

// Liefert ein Patch mit NUR den Feldern, die im Ziel leer sind und im Kandidaten
// einen Wert haben. Überschreibt nie vorhandene Werte (0/false gelten als gesetzt).
export const fillEmpty = <T extends Record<string, unknown>>(
  target: Partial<T>,
  candidate: Partial<T>
): Partial<T> => {
  const patch: Partial<T> = {};
  for (const k of Object.keys(candidate) as (keyof T)[]) {
    const cv = candidate[k];
    if (!isEmpty(cv) && isEmpty(target[k])) {
      patch[k] = cv as T[keyof T];
    }
  }
  return patch;
};
