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
