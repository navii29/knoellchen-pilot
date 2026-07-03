import { describe, it, expect } from "vitest";
import {
  buildContractInvoice,
  buildDepositInvoice,
  buildTicketInvoice,
} from "./lexoffice";

type C = Parameters<typeof buildContractInvoice>[0];
type V = Parameters<typeof buildContractInvoice>[2];
type T = Parameters<typeof buildTicketInvoice>[0];

const baseContract: C = {
  contract_nr: "MV-2026-0001",
  plate: "M-KP 2847",
  vehicle_type: "VW Golf",
  renter_name: "Max Mustermann",
  renter_address: "Teststr. 1, 12345 Berlin",
  pickup_date: "2026-06-01",
  return_date: "2026-06-08",
  actual_return_date: null,
  daily_rate: 49,
  weekly_rate: null,
  monthly_rate: null,
  total_amount: null,
  deposit: 500,
  km_excess: 0,
  extra_km_cost: null,
};

const mkContract = (o: Partial<C> = {}): C => ({ ...baseContract, ...o });

const baseVehicle: V = {
  manufacturer: "VW",
  model: "Golf",
  vehicle_type: "VW Golf",
  extra_km_price: 0.29,
  lexoffice_product_id: null,
};

// Hilfsfunktion: hat eine Rechnung irgendwo das Wort "Kaution" in einer Position?
const mentionsDeposit = (lineItems: { name?: string; description?: string }[]) =>
  lineItems.some(
    (li) =>
      /kaution/i.test(li.name ?? "") || /kaution/i.test(li.description ?? "")
  );

describe("buildContractInvoice — Miet-Rechnung", () => {
  it("enthält KEINE Kautions-Position (Kaution gehört in eine eigene Rechnung)", () => {
    const inv = buildContractInvoice(mkContract({ deposit: 1500 }), null, baseVehicle);
    expect(mentionsDeposit(inv.lineItems)).toBe(false);
  });

  it("ist eine Netto-Rechnung mit 19% auf die Miete", () => {
    const inv = buildContractInvoice(mkContract(), null, baseVehicle);
    expect(inv.taxConditions.taxType).toBe("net");
    const rental = inv.lineItems[0];
    expect(rental.unitPrice.taxRatePercentage).toBe(19);
    // 2026-06-01 → 2026-06-08 = 7 Tage
    expect(rental.quantity).toBe(7);
  });

  it("fügt eine Mehrkilometer-Position hinzu, wenn km_excess & Preis > 0", () => {
    const inv = buildContractInvoice(
      mkContract({ km_excess: 120 }),
      null,
      { ...baseVehicle, extra_km_price: 0.3 }
    );
    const km = inv.lineItems.find((li) => /mehrkilometer/i.test(li.name ?? ""));
    expect(km).toBeTruthy();
    expect(km!.unitPrice.taxRatePercentage).toBe(19);
    expect(km!.quantity).toBe(120);
  });

  it("rechnet den BRUTTO-Tagespreis in NETTO um (÷ 1,19) — Steuerbug-Regression", () => {
    // 119 € brutto = 100 € netto + 19 € USt
    const inv = buildContractInvoice(mkContract({ daily_rate: 119 }), null, baseVehicle);
    expect(inv.lineItems[0].unitPrice.netAmount).toBe(100);
  });

  it("rechnet den BRUTTO-Mehrkilometerpreis in NETTO um (÷ 1,19)", () => {
    const inv = buildContractInvoice(
      mkContract({ km_excess: 50 }),
      null,
      { ...baseVehicle, extra_km_price: 1.19 } // 1,19 brutto = 1,00 netto
    );
    const km = inv.lineItems.find((li) => /mehrkilometer/i.test(li.name ?? ""));
    expect(km!.unitPrice.netAmount).toBe(1);
  });

  it("nutzt actual_return_date statt return_date, wenn vorhanden", () => {
    const inv = buildContractInvoice(
      mkContract({ actual_return_date: "2026-06-11" }),
      null,
      baseVehicle
    );
    // 2026-06-01 → 2026-06-11 = 10 Tage
    expect(inv.lineItems[0].quantity).toBe(10);
  });

  it("verknüpft den LexOffice-Artikel, wenn lexoffice_product_id gesetzt ist", () => {
    const withId = buildContractInvoice(mkContract(), null, {
      ...baseVehicle,
      lexoffice_product_id: "art-123",
    });
    expect(withId.lineItems[0].type).toBe("service");
    const withoutId = buildContractInvoice(mkContract(), null, baseVehicle);
    expect(withoutId.lineItems[0].type).toBe("custom");
  });
});

describe("buildContractInvoice — Kleinunternehmer (§ 19 UStG)", () => {
  it("ist vatfree, 0% USt, netAmount == daily_rate (KEIN ÷ 1,19)", () => {
    const inv = buildContractInvoice(
      mkContract({ daily_rate: 119 }),
      null,
      baseVehicle,
      true
    );
    expect(inv.taxConditions.taxType).toBe("vatfree");
    const rental = inv.lineItems[0];
    expect(rental.unitPrice.taxRatePercentage).toBe(0);
    // Kein ÷ 1,19 → daily_rate ist bereits netto.
    expect(rental.unitPrice.netAmount).toBe(119);
  });

  it("Mehrkilometer-Position ebenfalls 0% USt, netAmount == extra_km_price", () => {
    const inv = buildContractInvoice(
      mkContract({ km_excess: 50 }),
      null,
      { ...baseVehicle, extra_km_price: 0.3 },
      true
    );
    const km = inv.lineItems.find((li) => /mehrkilometer/i.test(li.name ?? ""));
    expect(km).toBeTruthy();
    expect(km!.unitPrice.taxRatePercentage).toBe(0);
    expect(km!.unitPrice.netAmount).toBe(0.3);
  });
});

describe("buildContractInvoice — total_amount hat Vorrang vor Tage×Tagessatz", () => {
  it("Positions-Summe (Tage × Netto) entspricht dem ausgehandelten total_amount", () => {
    // 7 Tage, daily_rate 49 → 343 €; aber total_amount 280 € (Rabatt).
    const inv = buildContractInvoice(
      mkContract({ daily_rate: 49, total_amount: 280 }),
      null,
      baseVehicle
    );
    const rental = inv.lineItems[0];
    expect(rental.quantity).toBe(7);
    // Brutto-Positions-Summe muss total_amount entsprechen.
    const grossTotal = rental.unitPrice.netAmount * 1.19 * rental.quantity;
    expect(grossTotal).toBeCloseTo(280, 1);
  });

  it("Kleinunternehmer + total_amount: Netto-Positions-Summe == total_amount", () => {
    const inv = buildContractInvoice(
      mkContract({ daily_rate: 49, total_amount: 280 }),
      null,
      baseVehicle,
      true
    );
    const rental = inv.lineItems[0];
    expect(rental.unitPrice.taxRatePercentage).toBe(0);
    const netTotal = rental.unitPrice.netAmount * rental.quantity;
    expect(netTotal).toBeCloseTo(280, 1);
  });
});

describe("buildTicketInvoice — Kleinunternehmer (§ 19 UStG)", () => {
  const baseTicket: T = {
    ticket_nr: "KP-2041",
    reference_nr: "AZ-123",
    authority: "Stadt Berlin",
    fine_amount: 60,
    fee_net: 25,
    charge_fine: true,
    charge_fee: true,
    offense: "Falschparken",
    offense_date: "2026-06-05",
  };

  it("Regelbesteuerung: net, Gebühr 19%", () => {
    const inv = buildTicketInvoice(baseTicket, null, null);
    expect(inv.taxConditions.taxType).toBe("net");
    const fee = inv.lineItems.find((li) => /bearbeitungsgebühr/i.test(li.name ?? ""));
    expect(fee!.unitPrice.taxRatePercentage).toBe(19);
  });

  it("Kleinunternehmer: vatfree, Gebühr 0% USt", () => {
    const inv = buildTicketInvoice(baseTicket, null, null, true);
    expect(inv.taxConditions.taxType).toBe("vatfree");
    const fee = inv.lineItems.find((li) => /bearbeitungsgebühr/i.test(li.name ?? ""));
    expect(fee!.unitPrice.taxRatePercentage).toBe(0);
    // Bußgeld bleibt immer 0% (durchlaufender Posten).
    const fine = inv.lineItems.find((li) => /bußgeld/i.test(li.name ?? ""));
    expect(fine!.unitPrice.taxRatePercentage).toBe(0);
  });
});

describe("buildDepositInvoice — Kautions-Rechnung (steuerneutral)", () => {
  it("Regelbesteuerung: net mit 0% USt; Kleinunternehmer: vatfree", () => {
    // Regelbesteuerte Org: "net" mit 0 % (LexOffice lehnt vatfree sonst ab).
    const reg = buildDepositInvoice(mkContract({ deposit: 500 }), null);
    expect(reg.taxConditions.taxType).toBe("net");
    expect(reg.lineItems).toHaveLength(1);
    expect(reg.lineItems[0].unitPrice.taxRatePercentage).toBe(0);
    // Kleinunternehmer: vatfree.
    const klein = buildDepositInvoice(mkContract({ deposit: 500 }), null, true);
    expect(klein.taxConditions.taxType).toBe("vatfree");
    expect(klein.lineItems[0].unitPrice.taxRatePercentage).toBe(0);
  });

  it("stellt die Kaution als POSITIVEN Betrag in Rechnung (kein Minus)", () => {
    const inv = buildDepositInvoice(mkContract({ deposit: 750.5 }), null);
    expect(inv.lineItems[0].unitPrice.netAmount).toBe(750.5);
    expect(inv.lineItems[0].unitPrice.netAmount).toBeGreaterThan(0);
  });

  it("benennt die Position als Kaution/Sicherheitsleistung", () => {
    const inv = buildDepositInvoice(mkContract(), null);
    expect(mentionsDeposit(inv.lineItems)).toBe(true);
  });

  it("rundet auf 2 Nachkommastellen", () => {
    const inv = buildDepositInvoice(mkContract({ deposit: 333.333 }), null);
    expect(inv.lineItems[0].unitPrice.netAmount).toBe(333.33);
  });
});

describe("Stress/Fuzz — 5000 zufällige Verträge, Invarianten müssen halten", () => {
  it("Miet-Rechnung: nie eine Kaution drin, immer net, alle Beträge endlich, Menge ≥ 1", () => {
    for (let i = 0; i < 5000; i++) {
      const deposit = Math.round(Math.random() * 5000 * 100) / 100;
      const dailyRate = Math.round(Math.random() * 500 * 100) / 100;
      const kmExcess = Math.floor(Math.random() * 3000);
      const extraKm = Math.round(Math.random() * 2 * 100) / 100;
      const day = 1 + Math.floor(Math.random() * 27);
      const endDay = 1 + Math.floor(Math.random() * 27);
      const inv = buildContractInvoice(
        mkContract({
          deposit,
          daily_rate: dailyRate,
          km_excess: kmExcess,
          pickup_date: `2026-06-${String(day).padStart(2, "0")}`,
          return_date: `2026-06-${String(endDay).padStart(2, "0")}`,
        }),
        null,
        { ...baseVehicle, extra_km_price: extraKm }
      );
      expect(mentionsDeposit(inv.lineItems)).toBe(false);
      expect(inv.taxConditions.taxType).toBe("net");
      expect(inv.lineItems[0].quantity).toBeGreaterThanOrEqual(1);
      for (const li of inv.lineItems) {
        expect(Number.isFinite(li.unitPrice.netAmount)).toBe(true);
      }
    }
  });

  it("Kautions-Rechnung: 1 Position, 0% USt, Betrag = gerundete Kaution; net (Regel) / vatfree (Kleinunternehmer)", () => {
    for (let i = 0; i < 5000; i++) {
      const deposit = Math.round(Math.random() * 9999 * 100) / 100;
      const klein = Math.random() < 0.5;
      const inv = buildDepositInvoice(mkContract({ deposit }), null, klein);
      expect(inv.taxConditions.taxType).toBe(klein ? "vatfree" : "net");
      expect(inv.lineItems).toHaveLength(1);
      expect(inv.lineItems[0].unitPrice.taxRatePercentage).toBe(0);
      const amt = inv.lineItems[0].unitPrice.netAmount;
      expect(Number.isFinite(amt)).toBe(true);
      expect(amt).toBe(Math.round(deposit * 100) / 100);
    }
  });
});
