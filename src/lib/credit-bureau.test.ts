import { describe, it, expect } from "vitest";
import {
  creditDecisionFromScore,
  mockCreditResult,
  CREDIT_PROVIDERS,
  type CreditSubject,
} from "./credit-bureau";

// ---------------------------------------------------------------------------
// creditDecisionFromScore — Schwellen: >=70 gruen, >=40 gelb, sonst rot
// ---------------------------------------------------------------------------
describe("creditDecisionFromScore", () => {
  it("0 → rot", () => expect(creditDecisionFromScore(0)).toBe("rot"));
  it("39 → rot", () => expect(creditDecisionFromScore(39)).toBe("rot"));
  it("40 → gelb", () => expect(creditDecisionFromScore(40)).toBe("gelb"));
  it("69 → gelb", () => expect(creditDecisionFromScore(69)).toBe("gelb"));
  it("70 → gruen", () => expect(creditDecisionFromScore(70)).toBe("gruen"));
  it("100 → gruen", () => expect(creditDecisionFromScore(100)).toBe("gruen"));
  it("null → rot", () => expect(creditDecisionFromScore(null)).toBe("rot"));
});

// ---------------------------------------------------------------------------
// mockCreditResult — pur & deterministisch
// ---------------------------------------------------------------------------
describe("mockCreditResult", () => {
  const subject: CreditSubject = { name: "Max Mustermann" };

  it("ist deterministisch — gleiches Subjekt → identisches Ergebnis", () => {
    const a = mockCreditResult(subject);
    const b = mockCreditResult({ name: "Max Mustermann" });
    expect(a).toEqual(b);
  });

  it("Score liegt im Band 0–100", () => {
    const r = mockCreditResult(subject);
    expect(r.score).not.toBeNull();
    expect(r.score!).toBeGreaterThanOrEqual(0);
    expect(r.score!).toBeLessThanOrEqual(100);
  });

  it("Entscheidung ist konsistent mit dem Score", () => {
    for (const name of ["Anna Beispiel", "Müller GmbH", "Z", "Lara Vogt"]) {
      const r = mockCreditResult({ name });
      expect(r.decision).toBe(creditDecisionFromScore(r.score));
    }
  });

  it("verschiedene Namen liefern (i. d. R.) verschiedene Scores", () => {
    const a = mockCreditResult({ name: "Anna Beispiel" });
    const b = mockCreditResult({ name: "Boris Krause" });
    // Nicht hart garantiert, aber bei diesen beiden Namen unterschiedlich.
    expect(a.score).not.toBe(b.score);
  });

  it("liefert Rating, Provider 'mock' und eine Demo-Zusammenfassung", () => {
    const r = mockCreditResult(subject);
    expect(r.provider).toBe("mock");
    expect(typeof r.rating).toBe("string");
    expect(r.summary.toLowerCase()).toContain("demo");
  });
});

// ---------------------------------------------------------------------------
// CREDIT_PROVIDERS — enthält mindestens mock + generic
// ---------------------------------------------------------------------------
describe("CREDIT_PROVIDERS", () => {
  it("enthält den Mock-Adapter", () => {
    expect(CREDIT_PROVIDERS.some((p) => p.key === "mock")).toBe(true);
  });
  it("enthält den generischen Adapter", () => {
    expect(CREDIT_PROVIDERS.some((p) => p.key === "generic")).toBe(true);
  });
});
