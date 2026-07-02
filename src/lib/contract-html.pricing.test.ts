import { describe, it, expect } from "vitest";
import { buildContractHtml } from "./contract-html";
import type { Contract, Customer, Organization, Vehicle } from "./types";

// Preisblock des Mietvertrags: BEWUSST kein Gesamtbetrag im Dokument — nur der
// Preis des Abrechnungsmodells (Monatsmiete/Wochenmiete/Tagespreis); "Preis
// Zusatztage" ist der effektive Tagessatz (Monat ÷ 29, Woche ÷ 7, Tag pur).

const org = {
  name: "Test GmbH",
  street: "Teststr. 1",
  zip: "80331",
  city: "München",
} as unknown as Organization;

const baseContract = {
  contract_nr: "2026/07/0001",
  plate: "M-XX1234",
  renter_name: "Max Muster",
  pickup_date: "2026-07-01",
  return_date: "2026-12-28", // ~180 Tage
  daily_rate: null,
  weekly_rate: null,
  monthly_rate: null,
  total_amount: null,
  keys_count: 1,
} as unknown as Contract;

const render = (over: Partial<Contract>) =>
  buildContractHtml({
    org,
    contract: { ...baseContract, ...over } as Contract,
    customer: null as Customer | null,
    vehicle: null as Vehicle | null,
  });

describe("Mietvertrag-PDF — Preis des Abrechnungsmodells statt Gesamtbetrag", () => {
  it("Monats-Vertrag: zeigt Monatsmiete (1.450,00 €), KEINEN Gesamtbetrag, Zusatztage = ÷29", () => {
    const html = render({ monthly_rate: 1450 });
    expect(html).toContain("Monatsmiete brutto:");
    expect(html).toContain("1.450,00");
    // Zusatztage: 1450/29 = 50
    expect(html).toContain("Preis Zusatztage:");
    expect(html).toContain("50,00");
    // Kein Gesamtbetrag (6 Monate wären 9.000,00) und keine alte Zeile mehr:
    expect(html).not.toContain("Einzelmietpreis");
    expect(html).not.toContain("9.000,00");
  });

  it("Wochen-Vertrag: zeigt Wochenmiete (490,00 €), Zusatztage = ÷7 (70,00)", () => {
    const html = render({ weekly_rate: 490, return_date: "2026-07-15" });
    expect(html).toContain("Wochenmiete brutto:");
    expect(html).toContain("490,00");
    expect(html).toContain("70,00"); // 490/7
    expect(html).not.toContain("Einzelmietpreis");
  });

  it("Tages-Vertrag: zeigt Tagespreis (100,00 €), Zusatztage = Tagespreis", () => {
    const html = render({ daily_rate: 100, return_date: "2026-07-04" });
    expect(html).toContain("Tagespreis brutto:");
    expect(html).toContain("100,00");
    expect(html).not.toContain("Einzelmietpreis");
  });

  it("total_amount am Vertrag ändert die Anzeige NICHT mehr (bleibt intern)", () => {
    const html = render({ monthly_rate: 1450, total_amount: 8700 });
    expect(html).toContain("Monatsmiete brutto:");
    expect(html).not.toContain("8.700,00");
  });

  it("Netto/MwSt beziehen sich auf den Modell-Preis (1450 → netto 1.218,49)", () => {
    const html = render({ monthly_rate: 1450 });
    expect(html).toContain("Monatsmiete netto:");
    expect(html).toContain("1.218,49"); // 1450 / 1.19
  });

  it("Alt-Vertrag mit daily UND monthly → Geld-Vorrang Monat (keine widersprüchlichen Zeilen)", () => {
    const html = render({ daily_rate: 100, monthly_rate: 1450, return_date: "2026-07-04" });
    expect(html).toContain("Monatsmiete brutto:");
    // Zusatztage folgen demselben Vorrang (÷29 = 50), nicht dem rohen Tagespreis:
    expect(html).toContain("50,00");
  });
});
