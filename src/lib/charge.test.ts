import { describe, it, expect } from "vitest";
import { computeCharge } from "./charge";

describe("computeCharge", () => {
  it("rechnet 19% MwSt auf die Gebühr und addiert das Bußgeld", () => {
    const c = computeCharge({
      fineAmount: 55,
      chargeFine: true,
      feeNet: 25,
      chargeFee: true,
    });
    expect(c.fee_net).toBe(25);
    expect(c.fee_vat).toBe(4.75); // 25 * 0.19
    expect(c.fee_gross).toBe(29.75);
    expect(c.total_charge).toBe(84.75); // 55 + 29.75
  });

  it("Kleinunternehmer (vatRate 0): keine USt, gross === net", () => {
    const c = computeCharge({
      fineAmount: 55,
      chargeFine: true,
      feeNet: 25,
      chargeFee: true,
      vatRate: 0,
    });
    expect(c.fee_vat).toBe(0);
    expect(c.fee_gross).toBe(25);
    expect(c.total_charge).toBe(80);
  });

  it("rundet die USt kaufmännisch auf 2 Nachkommastellen", () => {
    // 29.99 * 0.19 = 5.6981 -> 5.70
    const c = computeCharge({ fineAmount: 0, chargeFine: false, feeNet: 29.99, chargeFee: true });
    expect(c.fee_vat).toBe(5.7);
    expect(c.fee_gross).toBe(35.69);
    expect(c.total_charge).toBe(35.69);
  });

  it("respektiert die charge-Flags (Bußgeld/Gebühr deaktivierbar)", () => {
    const onlyFine = computeCharge({ fineAmount: 55, chargeFine: true, feeNet: 25, chargeFee: false });
    expect(onlyFine.total_charge).toBe(55);

    const onlyFee = computeCharge({ fineAmount: 55, chargeFine: false, feeNet: 25, chargeFee: true });
    expect(onlyFee.total_charge).toBe(29.75);

    const nothing = computeCharge({ fineAmount: 55, chargeFine: false, feeNet: 25, chargeFee: false });
    expect(nothing.total_charge).toBe(0);
  });

  it("behandelt null/undefined-Eingaben als 0", () => {
    const c = computeCharge({ fineAmount: null, chargeFine: true, feeNet: undefined, chargeFee: true });
    expect(c.fine_amount).toBe(0);
    expect(c.fee_net).toBe(0);
    expect(c.total_charge).toBe(0);
  });
});
