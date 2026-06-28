import { describe, it, expect } from "vitest";
import { buildContractHtml } from "./contract-html";
import type { Contract, Customer, Organization, Vehicle } from "./types";

const org = {
  name: "Eazycar GmbH",
  street: "Eversbuschstraße 67",
  zip: "80999",
  city: "München",
  phone: "+49 176 31765218",
  email: "info@eazycar.de",
  rental_terms: "1. FAHRZEUGÜBERNAHME\nText.\n\n2. HAFTUNG\nText.",
} as unknown as Organization;

const contract = {
  contract_nr: "WOR-SL 63",
  plate: "WOR-SL 63",
  renter_name: "Manuel Kostinek",
  pickup_date: "2025-08-22",
  pickup_time: "15:00",
  return_date: "2025-08-24",
  return_time: "15:00",
  daily_rate: 399,
  total_amount: 798,
  deposit: 4000,
  km_limit: 400,
  km_pickup: 14954,
  fuel_level_pickup: "3/4 Füllstand",
  keys_count: 1,
  damages_at_handover: "Frontschürze vorne links / Felge VA rechts",
  payment_method: "cash",
  insurance_type: "full",
  insurance_deductible: 5000,
  custom_special_terms: "Nichtraucherfahrzeug\nRückgabe gereinigt",
} as unknown as Contract;

const customer = {
  first_name: "Manuel",
  last_name: "Kostinek",
  street: "Theodor-Fischer-Straße",
  house_nr: "3A",
  zip: "80999",
  city: "München",
  country: "Deutschland",
  phone: "+49 176 31765218",
  email: "kostinek.manuel@gmail.com",
} as unknown as Customer;

const vehicle = {
  manufacturer: "Mercedes-Benz",
  model: "SL 63 AMG Roadster",
  vehicle_type: "Mercedes-Benz SL 63 AMG Roadster",
  power_ps: 585,
  fuel_type: "Benzin",
  fin_number: "W1K2324811F002075",
  extra_km_price: 3.5,
} as unknown as Vehicle;

describe("buildContractHtml — eazycar 6-Seiten-Design", () => {
  const html = buildContractHtml({ org, contract, customer, vehicle });

  it("rendert genau 6 Seiten-Footer", () => {
    for (let n = 1; n <= 6; n++) {
      expect(html).toContain(`Seite ${n} von 6`);
    }
  });

  it("zeigt Fahrzeug, Mieter und Kennzeichen", () => {
    expect(html).toContain("Mercedes-Benz SL 63 AMG Roadster");
    expect(html).toContain("Manuel Kostinek");
    expect(html).toContain("WOR-SL 63");
    expect(html).toContain("W1K2324811F002075");
  });

  it("zeigt Brutto-Gesamtpreis und die Netto/MwSt-Aufschlüsselung", () => {
    expect(html).toContain("798,00");
    expect(html).toContain("Gesamtpreis (Brutto)");
    // 798 / 1,19 = 670,59 netto; nur prüfen, dass eine Aufschlüsselung da ist
    expect(html).toContain("zzgl. 19 % MwSt.");
  });

  it("rendert die Fahrzeugdaten-Seite + Übergabe/Rückgabe", () => {
    expect(html).toContain("Fahrzeugdaten");
    expect(html).toContain("Übergabe / Rückgabe");
    expect(html).toContain("14.954 km");
    expect(html).toContain("3/4 Füllstand");
  });

  it("rendert Sondervereinbarungen aus dem Freitext", () => {
    expect(html).toContain("Sondervereinbarungen");
    expect(html).toContain("Nichtraucherfahrzeug");
    expect(html).toContain("Rückgabe gereinigt");
  });

  it("rendert AGB, Datenschutz und Übergabeprotokoll", () => {
    expect(html).toContain("Allgemeine Mietbedingungen");
    expect(html).toContain("Datenschutzeinwilligung");
    expect(html).toContain("Übergabeprotokoll");
  });

  it("bettet das Fahrzeugbild ein, wenn vorhanden", () => {
    const withImg = buildContractHtml({
      org,
      contract,
      customer,
      vehicle,
      vehicleImageDataUri: "data:image/png;base64,AAAA",
    });
    expect(withImg).toContain("data:image/png;base64,AAAA");
  });

  it("escaped bösartige Werte (kein rohes <script>)", () => {
    const evil = buildContractHtml({
      org,
      contract: { ...contract, renter_name: "<script>alert(1)</script>" } as Contract,
      customer: null,
      vehicle,
    });
    expect(evil).not.toContain("<script>alert(1)</script>");
    expect(evil).toContain("&lt;script&gt;");
  });
});
