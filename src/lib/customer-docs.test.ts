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
