import { describe, it, expect } from "vitest";
import {
  resolveEffectiveDailyRate,
  estimateExtensionCost,
  deriveBillingModel,
  resolveBillingSelection,
  dailyRateForModel,
  totalForModel,
} from "./daily-rate";

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

  it("VERTRAGSPREIS gewinnt vor jedem Fahrzeugpreis: Vertrags-daily schlägt Fahrzeug-monthly", () => {
    // Regeländerung mit der Abrechnungsmodell-Umstellung: der Vertrag trägt
    // genau EIN Modell — die Fahrzeug-Preisliste übersteuert ihn nicht mehr
    // (früher gewann hier vehicle-monthly/29 = 50).
    expect(
      resolveEffectiveDailyRate({
        contractRate: 99,
        vehicleRate: 99,
        contractMonthlyRate: null,
        vehicleMonthlyRate: 1450,
      })
    ).toBe(99);
  });

  it("Fahrzeug-Fallback greift NUR bei preislosem Vertrag (dann Monat > Woche > Tag)", () => {
    expect(
      resolveEffectiveDailyRate({
        contractRate: null,
        vehicleRate: 99,
        vehicleMonthlyRate: 1450,
        vehicleWeeklyRate: 490,
      })
    ).toBe(50); // Fahrzeug-monthly/29
    expect(
      resolveEffectiveDailyRate({
        contractRate: null,
        vehicleRate: 99,
        vehicleWeeklyRate: 490,
      })
    ).toBe(70); // Fahrzeug-weekly/7
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

describe("resolveEffectiveDailyRate — Wochenpreis ÷ 7", () => {
  it("weekly gesetzt → weekly/7 (490/7 = 70), gewinnt über Tagespreis", () => {
    expect(
      resolveEffectiveDailyRate({ contractRate: 99, vehicleRate: null, contractWeeklyRate: 490 })
    ).toBe(70);
  });

  it("monthly gewinnt über weekly (Vorrang Monat > Woche > Tag)", () => {
    expect(
      resolveEffectiveDailyRate({
        contractRate: 99,
        vehicleRate: null,
        contractWeeklyRate: 490,
        contractMonthlyRate: 1450,
      })
    ).toBe(50);
  });

  it("VERTRAGS-weekly schlägt FAHRZEUG-monthly (Wochen-Vertrag wird nicht übersteuert)", () => {
    expect(
      resolveEffectiveDailyRate({
        contractRate: null,
        vehicleRate: 100,
        contractWeeklyRate: 490,
        vehicleMonthlyRate: 1450,
      })
    ).toBe(70);
  });

  it("weekly rundet auf Cent (500/7 = 71,43)", () => {
    expect(
      resolveEffectiveDailyRate({ contractRate: null, vehicleRate: null, contractWeeklyRate: 500 })
    ).toBe(71.43);
  });

  it("weekly weggelassen/0 → unverändertes Verhalten", () => {
    expect(resolveEffectiveDailyRate({ contractRate: 69, vehicleRate: 50 })).toBe(69);
    expect(
      resolveEffectiveDailyRate({ contractRate: 69, vehicleRate: 50, contractWeeklyRate: 0 })
    ).toBe(69);
  });
});

describe("deriveBillingModel — Zeitraum → Modell (>=29 Monat, >=7 Woche, sonst Tag)", () => {
  it("Grenzen: 6 Tage → Tag, 7 → Woche, 28 → Woche, 29 → Monat", () => {
    expect(deriveBillingModel(1)).toBe("daily");
    expect(deriveBillingModel(6)).toBe("daily");
    expect(deriveBillingModel(7)).toBe("weekly");
    expect(deriveBillingModel(28)).toBe("weekly");
    expect(deriveBillingModel(29)).toBe("monthly");
    expect(deriveBillingModel(180)).toBe("monthly");
  });
});

describe("resolveBillingSelection — abgeleitetes Modell mit Preis-Fallback", () => {
  const rates = { daily: 100, weekly: 490, monthly: 1450 };

  it("Zeitraum bestimmt das Modell, wenn dessen Preis existiert", () => {
    expect(resolveBillingSelection(3, rates)).toEqual({ model: "daily", rate: 100 });
    expect(resolveBillingSelection(14, rates)).toEqual({ model: "weekly", rate: 490 });
    expect(resolveBillingSelection(90, rates)).toEqual({ model: "monthly", rate: 1450 });
  });

  it("fehlt der Preis des abgeleiteten Modells → Fallback Tag → Woche → Monat", () => {
    expect(resolveBillingSelection(14, { daily: 100, weekly: null, monthly: 1450 })).toEqual({
      model: "daily",
      rate: 100,
    });
    expect(resolveBillingSelection(90, { daily: null, weekly: 490, monthly: null })).toEqual({
      model: "weekly",
      rate: 490,
    });
  });

  it("nur Monatspreis vorhanden (der Audi-Q3-Fall) → Monat, egal wie kurz", () => {
    expect(resolveBillingSelection(3, { daily: null, weekly: null, monthly: 1099 })).toEqual({
      model: "monthly",
      rate: 1099,
    });
  });

  it("gar kein Preis → abgeleitetes Modell mit rate null", () => {
    expect(resolveBillingSelection(3, { daily: null, weekly: "", monthly: 0 })).toEqual({
      model: "daily",
      rate: null,
    });
  });
});

describe("dailyRateForModel — effektiver Tagessatz je Modell", () => {
  it("Monat ÷ 29, Woche ÷ 7, Tag pur", () => {
    expect(dailyRateForModel("monthly", 1450)).toBe(50);
    expect(dailyRateForModel("weekly", 490)).toBe(70);
    expect(dailyRateForModel("daily", 100)).toBe(100);
  });
  it("leer/0/Müll → null", () => {
    expect(dailyRateForModel("monthly", null)).toBeNull();
    expect(dailyRateForModel("weekly", 0)).toBeNull();
    expect(dailyRateForModel("daily", "abc")).toBeNull();
  });
});

describe("totalForModel — Gesamtwert ohne Zwischenrundung (Drift-Fix)", () => {
  it("Woche 500 €, 14 Tage → exakt 1000,00 (nicht 1000,02)", () => {
    expect(totalForModel("weekly", 500, 14)).toBe(1000);
  });
  it("Monat 1099 €, 29 Tage → exakt 1099,00 (nicht 1099,10)", () => {
    expect(totalForModel("monthly", 1099, 29)).toBe(1099);
  });
  it("Tag 100 €, 3 Tage → 300,00", () => {
    expect(totalForModel("daily", 100, 3)).toBe(300);
  });
  it("Monat 1450 €, 90 Tage → round2(90 × 1450/29) = 4500,00", () => {
    expect(totalForModel("monthly", 1450, 90)).toBe(4500);
  });
  it("leer/0 Tage/kein Preis → null", () => {
    expect(totalForModel("weekly", null, 14)).toBeNull();
    expect(totalForModel("daily", 100, 0)).toBeNull();
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
