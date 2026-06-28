import { describe, it, expect } from "vitest";
import { mergeCustomerDocFields } from "./customer-docs";
import type { ParsedCustomerData } from "./types";

describe("mergeCustomerDocFields", () => {
  it("füllt id_card-Adresse + Nummer wenn der Kunde leer ist", () => {
    const existing = {
      first_name: "",
      last_name: null,
      id_card_nr: null,
      street: null,
      house_nr: null,
      zip: "",
      city: null,
    };
    const parsed: ParsedCustomerData = {
      first_name: "Max",
      last_name: "Mustermann",
      id_card_nr: "T22000129",
      street: "Musterstraße",
      house_nr: "12",
      zip: "80331",
      city: "München",
    };
    const { patch, filled } = mergeCustomerDocFields(existing, parsed, "id_card");
    expect(patch.street).toBe("Musterstraße");
    expect(patch.zip).toBe("80331");
    expect(patch.city).toBe("München");
    expect(patch.id_card_nr).toBe("T22000129");
    expect(filled).toEqual([
      "first_name",
      "last_name",
      "id_card_nr",
      "street",
      "house_nr",
      "zip",
      "city",
    ]);
  });

  it("überschreibt nie einen bereits vorhandenen Wert", () => {
    const existing = {
      first_name: "Bestehend",
      last_name: "Name",
      id_card_nr: "EXISTING-NR",
      street: "Alte Straße",
      house_nr: "1",
      zip: "10115",
      city: "Berlin",
    };
    const parsed: ParsedCustomerData = {
      first_name: "Neu",
      last_name: "Anders",
      id_card_nr: "NEW-NR",
      street: "Neue Straße",
      house_nr: "99",
      zip: "99999",
      city: "Hamburg",
    };
    const { patch, filled } = mergeCustomerDocFields(existing, parsed, "id_card");
    expect(patch).toEqual({});
    expect(filled).toEqual([]);
  });

  it("füllt nur die leeren Felder, lässt belegte unberührt", () => {
    const existing = {
      first_name: "Max",
      last_name: "",
      id_card_nr: "",
      street: "Hauptstraße",
      house_nr: "",
      zip: "",
      city: "",
    };
    const parsed: ParsedCustomerData = {
      first_name: "Moritz",
      last_name: "Mustermann",
      id_card_nr: "T22000129",
      street: "Andere Straße",
      house_nr: "5",
      zip: "12345",
      city: "Köln",
    };
    const { patch, filled } = mergeCustomerDocFields(existing, parsed, "id_card");
    expect(patch).not.toHaveProperty("first_name"); // belegt -> unberührt
    expect(patch).not.toHaveProperty("street"); // belegt -> unberührt
    expect(patch.last_name).toBe("Mustermann");
    expect(patch.id_card_nr).toBe("T22000129");
    expect(filled).toEqual(["last_name", "id_card_nr", "house_nr", "zip", "city"]);
  });

  it("füllt license-Nummer/Klasse/Gültigkeit für den Führerschein", () => {
    const existing = {
      first_name: null,
      last_name: null,
      birthday: null,
      license_nr: null,
      license_class: null,
      license_expiry: null,
    };
    const parsed: ParsedCustomerData = {
      first_name: "Max",
      last_name: "Mustermann",
      birthday: "1990-01-01",
      license_nr: "B072RRE2I55",
      license_class: "B, BE",
      license_expiry: "2031-03-01",
    };
    const { patch, filled } = mergeCustomerDocFields(existing, parsed, "license");
    expect(patch.license_nr).toBe("B072RRE2I55");
    expect(patch.license_class).toBe("B, BE");
    expect(patch.license_expiry).toBe("2031-03-01");
    expect(filled).toEqual([
      "first_name",
      "last_name",
      "birthday",
      "license_nr",
      "license_class",
      "license_expiry",
    ]);
  });

  it("normalisiert ein deutsches OCR-Datum zu ISO (statt es zu verwerfen)", () => {
    const existing = {
      first_name: null,
      last_name: null,
      birthday: null,
      license_nr: null,
      license_class: null,
      license_expiry: null,
    };
    const parsed: ParsedCustomerData = {
      license_nr: "B072RRE2I55",
      license_class: "B, BE",
      // Deutsches Format — wird jetzt normalisiert, nicht verworfen.
      license_expiry: "01.03.2031",
    };
    const { patch, filled } = mergeCustomerDocFields(existing, parsed, "license");
    expect(patch.license_nr).toBe("B072RRE2I55");
    expect(patch.license_class).toBe("B, BE");
    expect(patch.license_expiry).toBe("2031-03-01");
    expect(filled).toEqual(["license_nr", "license_class", "license_expiry"]);
  });

  it("verwirft nur ein WIRKLICH ungültiges Datum (kein Kalendertag)", () => {
    const existing = { license_nr: null, license_expiry: null };
    const parsed: ParsedCustomerData = {
      license_nr: "B072RRE2I55",
      license_expiry: "31.02.2031", // gibt es nicht
    };
    const { patch, filled } = mergeCustomerDocFields(existing, parsed, "license");
    expect(patch.license_nr).toBe("B072RRE2I55");
    expect(patch).not.toHaveProperty("license_expiry");
    expect(filled).toEqual(["license_nr"]);
  });

  it("übernimmt ein gültiges ISO-Datum unverändert", () => {
    const existing = { license_nr: null, license_expiry: null };
    const parsed: ParsedCustomerData = {
      license_nr: "B072RRE2I55",
      license_expiry: "2031-03-01",
    };
    const { patch, filled } = mergeCustomerDocFields(existing, parsed, "license");
    expect(patch.license_expiry).toBe("2031-03-01");
    expect(filled).toEqual(["license_nr", "license_expiry"]);
  });

  it("ignoriert leere/whitespace-OCR-Werte", () => {
    const existing = { license_nr: null, license_class: null };
    const parsed: ParsedCustomerData = {
      license_nr: "   ",
      license_class: null,
    };
    const { patch, filled } = mergeCustomerDocFields(existing, parsed, "license");
    expect(patch).toEqual({});
    expect(filled).toEqual([]);
  });

  it("gibt leeres patch zurück wenn kein Kunde geladen wurde", () => {
    const parsed: ParsedCustomerData = { id_card_nr: "T22000129" };
    const { patch, filled } = mergeCustomerDocFields(null, parsed, "id_card");
    expect(patch).toEqual({});
    expect(filled).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Regression #116 / Audit-Fund E11 — der OCR→Kunde-Datums-Bruch.
//
// Vor #116 prüfte der Merge das Datum mit
//   isStrictIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))
// und schrieb bei Treffer den ROHEN Wert ins Patch. Das hatte zwei Löcher:
//   1. Ein deutsches OCR-Datum ("01.03.2031") fiel beim Regex-Test durch und wurde
//      KOMPLETT verworfen — die Gültigkeit ging still verloren.
//   2. Ein ISO-FÖRMIGES, aber unmögliches Datum ("2031-02-31" — den 31. Februar
//      gibt es nicht) bestand isStrictIsoDate, weil Date.parse() es still überrollt
//      (kein NaN). Der rohe Wert landete im Patch → das atomare customers.update
//      scheiterte am DATE-Constraint → ALLE Patch-Felder (auch FS-Nr/Klasse) gingen
//      verloren.
// normalizeDate() schließt beide Löcher: deutsches Format → ISO, und eine echte
// Kalenderprüfung verwirft unmögliche Tage, BEVOR sie die DB erreichen.
//
// Hinweis zur Probe: Der im Audit genannte Beispielwert "1985-13-45" eignet sich
// NICHT — Monat 13 lässt Date.parse() schon vor #116 als NaN scheitern, der Wert
// wurde also auch alt verworfen (beide grün). Den Bruch deckt nur ein Datum auf,
// das Date.parse() überrollt: "2031-02-31".
describe("mergeCustomerDocFields — Regression #116 / E11 (OCR-Datums-Bruch)", () => {
  const emptyLicense = {
    first_name: null,
    last_name: null,
    birthday: null,
    license_nr: null,
    license_class: null,
    license_expiry: null,
  };

  // Fall A: ein GÜLTIGES (hier deutsches) Datum muss normalisiert im Patch landen —
  // gemeinsam mit den Textfeldern. Vor #116 fiel das deutsche Datum durch den
  // Regex-Test und wurde verworfen → license_expiry fehlte (rot).
  it("A) gültiges Datum landet normalisiert im Patch — zusammen mit den Textfeldern", () => {
    const parsed: ParsedCustomerData = {
      license_nr: "B072RRE2I55",
      license_class: "B, BE",
      license_expiry: "01.03.2031", // realistisches OCR-Format
    };
    const { patch, filled } = mergeCustomerDocFields(emptyLicense, parsed, "license");
    expect(patch.license_expiry).toBe("2031-03-01"); // normalisiert übernommen
    expect(patch.license_nr).toBe("B072RRE2I55"); // Textfeld dabei
    expect(patch.license_class).toBe("B, BE"); // Textfeld dabei
    expect(filled).toEqual(["license_nr", "license_class", "license_expiry"]);
  });

  // Fall B: ein UNMÖGLICHES Kalenderdatum darf das Ergebnis NICHT kippen. Das Datum
  // wird weggelassen, die Textfelder bleiben. Vor #116 wanderte der rohe Wert
  // "2031-02-31" ins Patch (Date.parse überrollt ihn) → DB-UPDATE wäre am DATE-
  // Constraint gescheitert und hätte FS-Nr + Klasse mitgerissen (rot).
  it("B) unmögliches Datum kippt den Patch NICHT — Datum fällt weg, Textfelder bleiben", () => {
    const parsed: ParsedCustomerData = {
      license_nr: "B072RRE2I55",
      license_class: "B, BE",
      license_expiry: "2031-02-31", // den 31. Februar gibt es nicht
    };
    const { patch, filled } = mergeCustomerDocFields(emptyLicense, parsed, "license");
    // Das kaputte Datum darf NICHT (auch nicht roh) ins Patch — sonst kippt es das
    // atomare DB-UPDATE und reißt die Textfelder mit.
    expect(patch).not.toHaveProperty("license_expiry");
    expect(patch.license_nr).toBe("B072RRE2I55"); // Textfeld überlebt
    expect(patch.license_class).toBe("B, BE"); // Textfeld überlebt
    expect(filled).toEqual(["license_nr", "license_class"]);
  });

  // Fall B deckt beide DATE-Spalten ab: auch ein kaputtes Geburtsdatum darf die
  // übrigen Felder nicht mitreißen.
  it("B2) auch ein kaputtes Geburtsdatum reißt die übrigen Felder nicht mit", () => {
    const parsed: ParsedCustomerData = {
      first_name: "Max",
      last_name: "Mustermann",
      birthday: "1985-02-31", // unmöglich
      license_nr: "B072RRE2I55",
    };
    const { patch, filled } = mergeCustomerDocFields(emptyLicense, parsed, "license");
    expect(patch).not.toHaveProperty("birthday");
    expect(patch.first_name).toBe("Max"); // Textfeld überlebt
    expect(patch.last_name).toBe("Mustermann"); // Textfeld überlebt
    expect(patch.license_nr).toBe("B072RRE2I55"); // Textfeld überlebt
    expect(filled).toEqual(["first_name", "last_name", "license_nr"]);
  });
});
