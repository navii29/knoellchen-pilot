import { describe, it, expect } from "vitest";
import { resolveCustomerNaming, customerDisplayName, companyDisplay } from "./customer";

describe("resolveCustomerNaming", () => {
  it("privat: behält Nachname", () => {
    const r = resolveCustomerNaming({ last_name: "Müller" });
    expect(r).toEqual({
      customer_type: "privat",
      company_name: null,
      legal_form: null,
      last_name: "Müller",
    });
  });

  it("privat ohne Nachname → Fehler", () => {
    const r = resolveCustomerNaming({ last_name: "   " });
    expect("error" in r).toBe(true);
  });

  it("firma explizit: spiegelt Firmenname + Rechtsform nach last_name", () => {
    const r = resolveCustomerNaming({
      customer_type: "firma",
      company_name: "LEVRA SERVICE",
      legal_form: "GmbH",
    });
    expect(r).toEqual({
      customer_type: "firma",
      company_name: "LEVRA SERVICE",
      legal_form: "GmbH",
      last_name: "LEVRA SERVICE GmbH",
    });
  });

  it("Privatkunde bleibt privat, wenn company UND Nachname da sind (CSV-Fehlmapping)", () => {
    const r = resolveCustomerNaming({ company_name: "Arbeitgeber GmbH", last_name: "Müller" });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.customer_type).toBe("privat");
      expect(r.last_name).toBe("Müller");
      expect(r.company_name).toBeNull();
    }
  });

  it("firma wird aus Firmenname erkannt (ohne Typ-Spalte, z. B. CSV-Import)", () => {
    const r = resolveCustomerNaming({ company_name: "Hall Bau", legal_form: "UG (haftungsbeschränkt)" });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.customer_type).toBe("firma");
      expect(r.last_name).toBe("Hall Bau UG (haftungsbeschränkt)");
    }
  });

  it("firma ohne Rechtsform: last_name = nur Firmenname", () => {
    const r = resolveCustomerNaming({ customer_type: "firma", company_name: "Acme" });
    if (!("error" in r)) expect(r.last_name).toBe("Acme");
  });

  it("firma ohne Firmenname → Fehler", () => {
    const r = resolveCustomerNaming({ customer_type: "firma", legal_form: "GmbH" });
    expect("error" in r).toBe(true);
  });

  it("nur Firmenname in der Nachname-Spalte wird als Firma akzeptiert", () => {
    const r = resolveCustomerNaming({ customer_type: "firma", last_name: "Solo AG" });
    if (!("error" in r)) {
      expect(r.company_name).toBe("Solo AG");
      expect(r.last_name).toBe("Solo AG");
    }
  });
});

describe("customerDisplayName", () => {
  const base = {
    title: null,
    first_name: null,
    last_name: "",
    company_name: null,
    legal_form: null,
  };

  it("Firma → Firmenname inkl. Rechtsform", () => {
    expect(
      customerDisplayName({
        ...base,
        customer_type: "firma",
        company_name: "LEVRA SERVICE",
        legal_form: "GmbH",
      })
    ).toBe("LEVRA SERVICE GmbH");
  });

  it("Privat → Titel + Vor- + Nachname", () => {
    expect(
      customerDisplayName({
        ...base,
        customer_type: "privat",
        title: "Dr.",
        first_name: "Anna",
        last_name: "Schmidt",
      })
    ).toBe("Dr. Anna Schmidt");
  });

  it("companyDisplay verbindet Name + Rechtsform", () => {
    expect(companyDisplay({ company_name: "Acme", legal_form: "AG" })).toBe("Acme AG");
    expect(companyDisplay({ company_name: "Acme", legal_form: null })).toBe("Acme");
  });
});
