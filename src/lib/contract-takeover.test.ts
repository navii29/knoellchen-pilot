import { describe, it, expect } from "vitest";
import {
  splitName,
  isCompanyName,
  parseAddress,
  normalizeLicenseNr,
  buildCustomerFromContract,
  matchCustomerId,
  fillEmpty,
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
  it("erkennt echte Rechtsformen", () => {
    expect(isCompanyName("LEVRA SERVICE GmbH")).toBe(true);
    expect(isCompanyName("Krause Bau e.K.")).toBe(true);
    expect(isCompanyName("Müller Transporte UG")).toBe(true);
    expect(isCompanyName("Max Mustermann")).toBe(false);
  });
  it("keine False-Positives bei privaten Namen", () => {
    // generische Branchenwörter dürfen NICHT als Firma greifen
    expect(isCompanyName("Mike Service")).toBe(false);
    expect(isCompanyName("Ek Wong")).toBe(false);
    expect(isCompanyName("Peter Bau")).toBe(false);
  });
});

describe("normalizeLicenseNr", () => {
  it("uppercase ohne Leerzeichen", () => {
    expect(normalizeLicenseNr("b072 rre2 i55")).toBe("B072RRE2I55");
    expect(normalizeLicenseNr("  ")).toBe(null);
    expect(normalizeLicenseNr(null)).toBe(null);
  });
});

describe("parseAddress", () => {
  it("parst Straße Hausnr, PLZ Ort", () => {
    expect(parseAddress("Hauptstraße 12, 80331 München")).toEqual({
      street: "Hauptstraße",
      house_nr: "12",
      zip: "80331",
      city: "München",
      country: null,
    });
  });
  it("trennt Land am Ende ab (Österreich landet nicht im Ort)", () => {
    expect(parseAddress("Oberst-Perleß-Straße 2, 8472 Straß in Steiermark, Österreich")).toEqual({
      street: "Oberst-Perleß-Straße",
      house_nr: "2",
      zip: "8472",
      city: "Straß in Steiermark",
      country: "Österreich",
    });
  });
  it("Fallback: alles in street", () => {
    expect(parseAddress("irgendwas unstrukturiert")).toEqual({
      street: "irgendwas unstrukturiert",
      house_nr: null,
      zip: null,
      city: null,
      country: null,
    });
  });
  it("leer → alles null", () => {
    expect(parseAddress(null)).toEqual({ street: null, house_nr: null, zip: null, city: null, country: null });
  });
});

describe("buildCustomerFromContract", () => {
  it("Privatkunde: Name/Adresse/Datum normalisiert", () => {
    const c = buildCustomerFromContract({
      renter_name: "Max Mustermann",
      renter_address: "Hauptstraße 12, 80331 München",
      renter_birthday: "14.05.1988",
      renter_license_nr: "b072 rre2 i55",
    });
    expect(c.customer_type).toBe("privat");
    expect(c.first_name).toBe("Max");
    expect(c.last_name).toBe("Mustermann");
    expect(c.zip).toBe("80331");
    expect(c.birthday).toBe("1988-05-14");
    expect(c.license_nr).toBe("B072RRE2I55");
  });
  it("Firma: company_name gesetzt, last_name = Name", () => {
    const c = buildCustomerFromContract({ renter_name: "LEVRA SERVICE GmbH" });
    expect(c.customer_type).toBe("firma");
    expect(c.company_name).toBe("LEVRA SERVICE GmbH");
    expect(c.last_name).toBe("LEVRA SERVICE GmbH");
    expect(c.first_name).toBe(null);
  });
});

describe("matchCustomerId — FS → Firma → Name+Geburtstag → null", () => {
  const existing = [
    { id: "c1", license_nr: "B072RRE2I55", first_name: "Max", last_name: "Mustermann", birthday: "1988-05-14", company_name: null },
    { id: "c2", license_nr: null, first_name: "Erika", last_name: "Beispiel", birthday: "1979-11-02", company_name: null },
    { id: "c3", license_nr: null, first_name: null, last_name: "LEVRA SERVICE GmbH", birthday: null, company_name: "LEVRA SERVICE GmbH" },
  ];
  it("Stufe 1: FS-Nr (normalisiert)", () => {
    expect(matchCustomerId({ license_nr: "b072 rre2 i55", name: "X Y", birthday: null }, existing)).toBe("c1");
  });
  it("Stufe 2: Firma über Firmennamen (kein FS/Geburtstag)", () => {
    expect(matchCustomerId({ license_nr: null, name: "LEVRA SERVICE GmbH", birthday: null }, existing)).toBe("c3");
  });
  it("Stufe 3: Name + Geburtstag (Format-tolerant)", () => {
    expect(matchCustomerId({ license_nr: null, name: "Erika Beispiel", birthday: "02.11.1979" }, existing)).toBe("c2");
  });
  it("FS-Konflikt verhindert Falschverschmelzung (gleicher Name+Geb, andere FS-Nr)", () => {
    expect(
      matchCustomerId({ license_nr: "FS-ANDERS-999", name: "Max Mustermann", birthday: "1988-05-14" }, existing)
    ).toBe(null);
  });
  it("nichts eindeutig → null", () => {
    expect(matchCustomerId({ license_nr: null, name: "Erika Beispiel", birthday: null }, existing)).toBe(null);
    expect(matchCustomerId({ license_nr: "UNBEKANNT", name: "Wer Auch", birthday: "01.01.2000" }, existing)).toBe(null);
  });
});

describe("fillEmpty — nur leere Zielfelder, candidate non-null", () => {
  it("füllt nur Lücken, überschreibt nie", () => {
    type T = { a: string | null; b: string | null; c: string | null; d: number | null };
    const target: Partial<T> = { a: "vorhanden", b: null, c: "", d: 0 };
    const candidate: Partial<T> = { a: "neu", b: "B", c: "C", d: 5 };
    expect(fillEmpty<T>(target, candidate)).toEqual({ b: "B", c: "C" });
    // d=0 gilt als gesetzt (Zahl), wird nicht überschrieben
  });
  it("leeres Patch wenn nichts zu füllen", () => {
    expect(fillEmpty({ a: "x" }, { a: "y" })).toEqual({});
  });
});
