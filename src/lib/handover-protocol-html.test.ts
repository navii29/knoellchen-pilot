import { describe, it, expect } from "vitest";
import { buildHandoverProtocolHtml } from "./handover-protocol-html";
import type { Contract, Customer, Organization, Vehicle } from "./types";

// Minimaler, plausibler Datensatz — nur Felder, die das Template anfasst,
// müssen stimmen; der Rest wird via Cast erfüllt (reiner String-Test, kein
// Browser, kein Netzwerk).
const org = {
  id: "org-1",
  name: "Muster Autovermietung GmbH",
  street: "Hauptstr. 1",
  zip: "12345",
  city: "Berlin",
  city_label: "Berlin",
} as unknown as Organization;

const baseContract = {
  id: "c-1",
  org_id: "org-1",
  contract_nr: "KP-2041",
  plate: "B-AB 1234",
  vehicle_type: "VW Golf VIII",
  renter_name: "Max Mustermann",
  renter_address: "Beispielweg 2, 54321 Hamburg",
  pickup_date: "2026-06-01",
  pickup_time: "10:00",
  return_date: "2026-06-10",
  return_time: "16:30",
  km_pickup: 45200,
  km_return: 45980,
  fuel_level_pickup: "Voll",
  fuel_level_return: "¾",
  damages_at_handover: "Kratzer vorne links",
  condition_at_return: "Steinschlag Frontscheibe",
} as unknown as Contract;

const customer = {
  id: "cust-1",
  org_id: "org-1",
  first_name: "Max",
  last_name: "Mustermann",
  street: "Beispielweg",
  house_nr: "2",
  zip: "54321",
  city: "Hamburg",
} as unknown as Customer;

const vehicle = {
  id: "v-1",
  org_id: "org-1",
  manufacturer: "VW",
  model: "Golf VIII",
  fin_number: "WVWZZZ1KZAW000001",
} as unknown as Vehicle;

const PNG = "data:image/png;base64,iVBORw0KAAAA";

const build = (over: Partial<Parameters<typeof buildHandoverProtocolHtml>[0]> = {}) =>
  buildHandoverProtocolHtml({
    org,
    contract: baseContract,
    customer,
    vehicle,
    type: "pickup",
    photos: [],
    sigLessorPng: null,
    sigRenterPng: null,
    logoDataUri: null,
    ...over,
  });

describe("buildHandoverProtocolHtml", () => {
  it("enthält km-Stand, Tankstand und Zustand des jeweiligen Vorgangs (Übergabe)", () => {
    const html = build({ type: "pickup" });
    expect(html).toContain("45.200");
    expect(html).toContain("Voll");
    expect(html).toContain("Kratzer vorne links");
  });

  it("nutzt die Rückgabe-Werte für type=return", () => {
    const html = build({ type: "return" });
    expect(html).toContain("45.980");
    expect(html).toContain("¾");
    expect(html).toContain("Steinschlag Frontscheibe");
    // Übergabe-spezifischer Zustand darf nicht im Rückgabe-Protokoll stehen.
    expect(html).not.toContain("Kratzer vorne links");
  });

  it("rendert beide Unterschrift-Images, wenn PNGs vorhanden sind", () => {
    const html = build({ sigLessorPng: PNG, sigRenterPng: PNG });
    const imgCount = (html.match(new RegExp(`<img src="${PNG}"`, "g")) ?? []).length;
    expect(imgCount).toBe(2);
    expect(html).toContain("Unterschrift Vermieter");
    expect(html).toContain("Unterschrift Mieter");
  });

  it("lässt Unterschrift-Images weg, wenn PNGs null sind (kein Crash)", () => {
    const html = build({ sigLessorPng: null, sigRenterPng: null });
    expect(html).not.toContain("<img");
    // Die Beschriftungen der Signaturblöcke bleiben trotzdem erhalten.
    expect(html).toContain("Unterschrift Vermieter");
    expect(html).toContain("Unterschrift Mieter");
  });

  it("escaped einen bösartigen Kundennamen (kein rohes <script> im Output)", () => {
    const evil = {
      ...customer,
      first_name: "<script>alert(1)</script>",
      last_name: "Hacker",
    } as unknown as Customer;
    const html = build({ customer: evil });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("zeigt Uebergabe bzw. Rueckgabe je nach Typ", () => {
    expect(build({ type: "pickup" })).toContain("Übergabe");
    const ret = build({ type: "return" });
    expect(ret).toContain("Rückgabe");
    expect(ret).toContain("Zustand bei Rückgabe");
  });

  it("rendert die Foto-Thumbnails mit Label", () => {
    const html = build({
      photos: [{ position: "front", label: "Vorne", dataUri: PNG }],
    });
    expect(html).toContain(`<img src="${PNG}"`);
    expect(html).toContain("Vorne");
  });
});
