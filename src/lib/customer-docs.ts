import type { ParsedCustomerData } from "./types";
import { normalizeDate } from "./csv-import";

// Welche Customer-Felder je Dokumenttyp aus dem OCR-Ergebnis übernommen werden.
// Identisch zu den Check-in-Routen (license/id-card) — die Logik lebt hier an
// EINER Stelle, damit Portal- und Dashboard-Upload sich nie auseinanderlaufen.
// Ein deutscher Führerschein trägt KEINE Adresse — daher fehlen street/zip/city
// in der license-Liste; nur der Personalausweis liefert die Anschrift.
export const CUSTOMER_DOC_FILL_KEYS = {
  license: [
    "first_name",
    "last_name",
    "birthday",
    "birth_place",
    "license_nr",
    "license_class",
    "license_expiry",
    "license_issued",
  ],
  id_card: [
    "first_name",
    "last_name",
    "birth_place",
    "id_card_nr",
    "id_card_authority",
    "street",
    "house_nr",
    "zip",
    "city",
  ],
} as const;

export type CustomerDocType = keyof typeof CUSTOMER_DOC_FILL_KEYS;

// DATE-Spalten: die OCR liefert das Datum oft im deutschen Format ("01.03.2031").
// Das wird zu ISO normalisiert (wie beim Vertrags-/CSV-Import), damit es nicht
// verloren geht. Erst wenn es WIRKLICH kein gültiges Kalenderdatum ist, wird das
// Feld übersprungen — so kippt ein Datums-Fehler nie das atomare UPDATE.
const DATE_KEYS = new Set<string>(["birthday", "license_expiry", "license_issued"]);

/**
 * Fill-if-empty-Merge: liefert ein `patch` nur mit den Feldern, die laut OCR
 * einen nicht-leeren Wert haben UND beim Kunden bisher leer/null sind — bereits
 * eingetragene Daten werden NIE überschrieben. `filled` listet die übernommenen
 * Feldnamen (für die UI-Rückmeldung „N Felder ausgelesen“). Reine Funktion.
 */
export const mergeCustomerDocFields = (
  existing: Record<string, unknown> | null | undefined,
  parsed: ParsedCustomerData,
  docType: CustomerDocType
): { patch: Record<string, unknown>; filled: string[] } => {
  const patch: Record<string, unknown> = {};
  const filled: string[] = [];
  // Ohne geladenen Kunden NICHT schreiben — sonst gälte jedes Feld als leer und
  // würde fälschlich befüllt. Caller behandelt fehlenden Kunden separat.
  if (!existing) return { patch, filled };

  for (const key of CUSTOMER_DOC_FILL_KEYS[docType]) {
    const v = parsed[key];
    if (typeof v !== "string" || !v.trim()) continue;
    // Datumsfelder zu ISO normalisieren (deutsches Format → YYYY-MM-DD); nur ein
    // wirklich ungültiges Datum überspringen, sonst landet es verworfen im Nichts.
    let value = v.trim();
    if (DATE_KEYS.has(key)) {
      const iso = normalizeDate(value);
      if (!iso) continue;
      value = iso;
    }
    const current = existing[key];
    if (current == null || current === "") {
      patch[key] = value;
      filled.push(key);
    }
  }
  return { patch, filled };
};
