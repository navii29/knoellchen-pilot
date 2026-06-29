import { describe, it, expect } from "vitest";
import { resolveEffectiveDailyRate, estimateExtensionCost } from "./daily-rate";

describe("resolveEffectiveDailyRate", () => {
  it("Vertragspreis gesetzt → der Vertragspreis (auch wenn Fahrzeugpreis existiert)", () => {
    expect(resolveEffectiveDailyRate({ contractRate: 69, vehicleRate: 50 })).toBe(69);
  });

  it("Vertragspreis leer (null) → Fahrzeugpreis", () => {
    expect(resolveEffectiveDailyRate({ contractRate: null, vehicleRate: 69 })).toBe(69);
    expect(resolveEffectiveDailyRate({ contractRate: undefined, vehicleRate: 69 })).toBe(69);
  });

  it("Vertragspreis 0 zählt als leer → Fahrzeugpreis", () => {
    expect(resolveEffectiveDailyRate({ contractRate: 0, vehicleRate: 69 })).toBe(69);
  });

  it("String-Preise werden geparst", () => {
    expect(resolveEffectiveDailyRate({ contractRate: "69.00", vehicleRate: null })).toBe(69);
    expect(resolveEffectiveDailyRate({ contractRate: "", vehicleRate: "50" })).toBe(50);
  });

  it("beide leer/0 → null", () => {
    expect(resolveEffectiveDailyRate({ contractRate: null, vehicleRate: null })).toBeNull();
    expect(resolveEffectiveDailyRate({ contractRate: 0, vehicleRate: 0 })).toBeNull();
    expect(resolveEffectiveDailyRate({ contractRate: "", vehicleRate: undefined })).toBeNull();
  });

  it("negativ oder Müll gilt als leer", () => {
    expect(resolveEffectiveDailyRate({ contractRate: -5, vehicleRate: 40 })).toBe(40);
    expect(resolveEffectiveDailyRate({ contractRate: "abc", vehicleRate: "xyz" })).toBeNull();
  });
});

describe("resolveEffectiveDailyRate — Monatspreis ÷ 29", () => {
  it("monthly gesetzt → monthly/29, auf Cent gerundet (2000/29 = 68,97)", () => {
    expect(
      resolveEffectiveDailyRate({ contractRate: null, vehicleRate: null, contractMonthlyRate: 2000 })
    ).toBe(68.97);
  });

  it("monthly UND daily gesetzt → monthly gewinnt (1200/29 = 41,38)", () => {
    expect(
      resolveEffectiveDailyRate({ contractRate: 50, vehicleRate: 60, contractMonthlyRate: 1200 })
    ).toBe(41.38);
  });

  it("contract-monthly vor vehicle-monthly", () => {
    expect(
      resolveEffectiveDailyRate({
        contractRate: null,
        vehicleRate: null,
        contractMonthlyRate: 2000,
        vehicleMonthlyRate: 1000,
      })
    ).toBe(68.97);
  });

  it("nur vehicle-monthly gesetzt → vehicle-monthly/29, gewinnt über Tagespreis (1450/29 = 50)", () => {
    expect(
      resolveEffectiveDailyRate({
        contractRate: 99,
        vehicleRate: 99,
        contractMonthlyRate: null,
        vehicleMonthlyRate: 1450,
      })
    ).toBe(50);
  });

  it("monthly 0/null → reines Tages-Verhalten", () => {
    expect(
      resolveEffectiveDailyRate({ contractRate: 69, vehicleRate: 50, contractMonthlyRate: 0 })
    ).toBe(69);
    expect(
      resolveEffectiveDailyRate({
        contractRate: 69,
        vehicleRate: 50,
        contractMonthlyRate: null,
        vehicleMonthlyRate: null,
      })
    ).toBe(69);
  });

  it("monthly weggelassen (Anlage-Flow, zweiarmig) → unverändert", () => {
    expect(resolveEffectiveDailyRate({ contractRate: 69, vehicleRate: 50 })).toBe(69);
  });

  it("Verlängerungskosten end-to-end: 7 Tage × (2000/29) = 482,79", () => {
    const rate = resolveEffectiveDailyRate({
      contractRate: null,
      vehicleRate: null,
      contractMonthlyRate: 2000,
    });
    expect(estimateExtensionCost({ extraDays: 7, rate })).toBe(482.79); // 7 × 68,97
  });
});

describe("estimateExtensionCost", () => {
  it("Tage × Preis, auf Cent gerundet", () => {
    expect(estimateExtensionCost({ extraDays: 5, rate: 69 })).toBe(345);
    expect(estimateExtensionCost({ extraDays: 3, rate: 49.99 })).toBe(149.97);
  });

  it("fehlender Preis → null (Aufrufer zeigt Hinweis statt 0,00)", () => {
    expect(estimateExtensionCost({ extraDays: 5, rate: null })).toBeNull();
    expect(estimateExtensionCost({ extraDays: 5, rate: undefined })).toBeNull();
  });

  it("fehlende/ungültige Tage → null", () => {
    expect(estimateExtensionCost({ extraDays: null, rate: 69 })).toBeNull();
    expect(estimateExtensionCost({ extraDays: Number.NaN, rate: 69 })).toBeNull();
  });

  it("rate 0 → 0 (gültig: Preis ausdrücklich 0)", () => {
    expect(estimateExtensionCost({ extraDays: 5, rate: 0 })).toBe(0);
  });
});
