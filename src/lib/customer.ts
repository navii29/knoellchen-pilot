import type { Customer } from "./types";

// Rechtsformen für Firmenkunden (DE/AT/CH-Fokus).
export const LEGAL_FORMS: ReadonlyArray<string> = [
  "GmbH",
  "UG (haftungsbeschränkt)",
  "GmbH & Co. KG",
  "AG",
  "KG",
  "OHG",
  "GbR",
  "e.K.",
  "e.V.",
  "gGmbH",
  "Einzelunternehmen",
  "Freiberufler",
  "Sonstige",
];

// Länderauswahl im Adressblock (Default Deutschland).
export const COUNTRIES: ReadonlyArray<string> = [
  "Deutschland",
  "Österreich",
  "Schweiz",
  "Niederlande",
  "Belgien",
  "Luxemburg",
  "Frankreich",
  "Italien",
  "Polen",
  "Tschechien",
  "Dänemark",
  "Liechtenstein",
  "Andere",
];

type Naming = Pick<
  Customer,
  "customer_type" | "company_name" | "legal_form" | "title" | "first_name" | "last_name"
>;

export const isCompany = (c: Pick<Customer, "customer_type">): boolean =>
  c.customer_type === "firma";

/** Firmenname inkl. Rechtsform, z. B. "LEVRA SERVICE GmbH". */
export const companyDisplay = (
  c: Pick<Customer, "company_name" | "legal_form">
): string => [c.company_name, c.legal_form].filter(Boolean).join(" ").trim();

/** Anzeigename: Firma → Firmenname (+ Rechtsform), sonst Person. */
export const customerDisplayName = (c: Naming): string => {
  if (c.customer_type === "firma") {
    const co = companyDisplay(c);
    if (co) return co;
  }
  return (
    [c.title, c.first_name, c.last_name].filter(Boolean).join(" ") ||
    c.last_name ||
    ""
  );
};

type NamingInput = {
  customer_type?: unknown;
  company_name?: unknown;
  legal_form?: unknown;
  last_name?: unknown;
};

type ResolvedNaming = {
  customer_type: "privat" | "firma";
  company_name: string | null;
  legal_form: string | null;
  last_name: string;
};

const tn = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

/**
 * Vereinheitlicht die Namensfelder für Insert/Update/Import:
 *  - Firma erkannt, wenn customer_type explizit "firma" ODER ein Firmenname da ist
 *    (so funktioniert auch ein CSV-Import ohne Typ-Spalte).
 *  - Firma: last_name wird mit "Firmenname Rechtsform" gespiegelt (NOT-NULL +
 *    Abwärtskompatibilität für Verträge/PDFs/Rechnungen).
 *  - Privat: Nachname ist Pflicht.
 * Gibt bei fehlendem Pflichtfeld { error } zurück.
 */
export const resolveCustomerNaming = (
  input: NamingInput
): ResolvedNaming | { error: string } => {
  const t = String(input.customer_type ?? "").trim().toLowerCase();
  const company = tn(input.company_name);
  const legal = tn(input.legal_form);
  const rawLast = tn(input.last_name);
  const explicitFirma = ["firma", "company", "unternehmen", "gewerbe", "business"].includes(t);
  // Firma nur, wenn customer_type explizit gesetzt ist ODER ein Firmenname OHNE
  // Nachname vorliegt. Sonst würde beim CSV-Import eine versehentlich auf
  // company_name gemappte Spalte jede Zeile mit Wert zu Firma machen und den
  // echten Vor-/Nachnamen überschreiben.
  const type: "privat" | "firma" =
    explicitFirma || (!!company && !rawLast) ? "firma" : "privat";

  if (type === "firma") {
    const co = company ?? rawLast; // nur Firmenname in der Nachname-Spalte? trotzdem akzeptieren
    if (!co) return { error: "Pflichtfeld fehlt: Firmenname" };
    return {
      customer_type: "firma",
      company_name: co,
      legal_form: legal,
      last_name: [co, legal].filter(Boolean).join(" "),
    };
  }
  if (!rawLast) return { error: "Pflichtfeld fehlt: Nachname" };
  return {
    customer_type: "privat",
    company_name: null,
    legal_form: null,
    last_name: rawLast,
  };
};
