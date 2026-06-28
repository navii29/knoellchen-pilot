import { describe, it, expect } from "vitest";
import { computeReturnSummary, type ReturnSummaryInput } from "./km";

// Basis ohne km-Rauschen (alle km-Quellen leer → excessKm 0, cost 0), damit die
// Zusatztage-Logik isoliert prüfbar ist.
const base: ReturnSummaryInput = {
  pickupDate: "2026-07-01",
  plannedReturnDate: "2026-07-15",
  actualReturnDate: "2026-07-15",
  kmPickup: null,
  kmReturn: null,
  inclusiveKmMonth: null,
  kmLimitOverride: null,
  pricePerKm: null,
  originalReturnDate: null,
  dailyRate: null,
};

describe("computeReturnSummary — Zusatztage", () => {
  it("genau am Originaldatum → extraDays 0, Kosten 0", () => {
    const r = computeReturnSummary({
      ...base,
      originalReturnDate: "2026-07-15",
      actualReturnDate: "2026-07-15",
      dailyRate: 69,
    });
    expect(r.extraDays).toBe(0);
    expect(r.extraDaysCost).toBe(0);
    expect(r.totalExtraCost).toBe(0);
  });

  it("Verlängerung + Rückgabe am verlängerten Datum → Tage über Original werden berechnet", () => {
    // Original 08.07, verlängert (planned) + zurück am 15.07 → 7 Zusatztage × 69 €.
    const r = computeReturnSummary({
      ...base,
      originalReturnDate: "2026-07-08",
      plannedReturnDate: "2026-07-15",
      actualReturnDate: "2026-07-15",
      dailyRate: 69,
    });
    expect(r.daysDiff).toBe(0); // gegenüber dem verlängerten Datum planmäßig
    expect(r.extraDays).toBe(7); // aber 7 Tage über das Originaldatum
    expect(r.extraDaysCost).toBe(483);
    expect(r.totalExtraCost).toBe(483);
  });

  it("kein Originaldatum (Altvertrag) → extraDays 0, kein Absturz", () => {
    const r = computeReturnSummary({
      ...base,
      originalReturnDate: null,
      actualReturnDate: "2026-07-20",
      dailyRate: 69,
    });
    expect(r.extraDays).toBe(0);
    expect(r.extraDaysCost).toBe(0);
  });

  it("Tagespreis leer/0 → extraDays bleibt, aber Kosten 0", () => {
    const r = computeReturnSummary({
      ...base,
      originalReturnDate: "2026-07-08",
      actualReturnDate: "2026-07-15",
      dailyRate: null,
    });
    expect(r.extraDays).toBe(7);
    expect(r.extraDaysCost).toBe(0);
    expect(r.dailyRate).toBe(0);
  });
});

describe("computeReturnSummary — Mehr-km bleibt unverändert", () => {
  it("Mehrkilometer × Preis weiterhin korrekt", () => {
    const r = computeReturnSummary({
      ...base,
      kmPickup: 1000,
      kmReturn: 3000,
      kmLimitOverride: 1000,
      pricePerKm: 0.3,
    });
    expect(r.drivenKm).toBe(2000);
    expect(r.allowedKm).toBe(1000);
    expect(r.excessKm).toBe(1000);
    expect(r.cost).toBe(300);
    expect(r.extraDays).toBe(0);
    expect(r.totalExtraCost).toBe(300);
  });

  it("totalExtraCost = Mehr-km + Zusatztage", () => {
    const r = computeReturnSummary({
      ...base,
      kmPickup: 1000,
      kmReturn: 3000,
      kmLimitOverride: 1000,
      pricePerKm: 0.3, // → cost 300
      originalReturnDate: "2026-07-08",
      actualReturnDate: "2026-07-15",
      dailyRate: 69, // → extraDaysCost 483
    });
    expect(r.cost).toBe(300);
    expect(r.extraDaysCost).toBe(483);
    expect(r.totalExtraCost).toBe(783);
  });
});
