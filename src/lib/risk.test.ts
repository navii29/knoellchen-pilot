import { describe, it, expect } from "vitest";
import {
  levelFromScore,
  assembleRiskSignals,
  deriveHeuristicScore,
  normalizeAiRisk,
  RISK_THRESHOLDS,
} from "./risk";

// ---------------------------------------------------------------------------
// levelFromScore
// ---------------------------------------------------------------------------
describe("levelFromScore", () => {
  it("0 → gruen", () => expect(levelFromScore(0)).toBe("gruen"));
  it("33 → gruen", () => expect(levelFromScore(33)).toBe("gruen"));
  it("34 → gelb", () => expect(levelFromScore(34)).toBe("gelb"));
  it("66 → gelb", () => expect(levelFromScore(66)).toBe("gelb"));
  it("67 → rot", () => expect(levelFromScore(67)).toBe("rot"));
  it("100 → rot", () => expect(levelFromScore(100)).toBe("rot"));

  it("RISK_THRESHOLDS.rot === 67", () =>
    expect(RISK_THRESHOLDS.rot).toBe(67));
  it("RISK_THRESHOLDS.gelb === 34", () =>
    expect(RISK_THRESHOLDS.gelb).toBe(34));
});

// ---------------------------------------------------------------------------
// assembleRiskSignals
// ---------------------------------------------------------------------------
describe("assembleRiskSignals", () => {
  const today = new Date("2026-06-23");

  const baseCustomer = {
    license_nr: "B123456789",
    license_photo_path: null,
    license_expiry: "2030-01-01",
    id_card_nr: "T22000129",
    id_card_photo_path: null,
    birthday: "1990-06-23",
    first_name: "Max",
    last_name: "Mustermann",
    company_name: null,
    street: "Hauptstraße 1",
    zip: "80331",
    city: "München",
    email: "max@example.com",
    phone: "+4989123456",
  } as const;

  const baseHistory = {
    priorContracts: 3,
    overdueUnpaid: 0,
    priorDamages: 0,
    openTickets: 0,
  };

  const baseFinance = { total_amount: 200, deposit: 500 };

  it("license.valid === true for future expiry", () => {
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: { ...baseCustomer, license_expiry: "2030-01-01" },
      history: baseHistory,
      finance: baseFinance,
      today,
    });
    expect(s.license.valid).toBe(true);
  });

  it("license.valid === false for past expiry", () => {
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: { ...baseCustomer, license_expiry: "2020-01-01" },
      history: baseHistory,
      finance: baseFinance,
      today,
    });
    expect(s.license.valid).toBe(false);
  });

  it("license.valid === null when no expiry", () => {
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: { ...baseCustomer, license_expiry: null },
      history: baseHistory,
      finance: baseFinance,
      today,
    });
    expect(s.license.valid).toBeNull();
  });

  it("age computed correctly from fixed birthday + today", () => {
    // birthday 1990-06-23, today 2026-06-23 → exactly 36
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: { ...baseCustomer, birthday: "1990-06-23" },
      history: baseHistory,
      finance: baseFinance,
      today,
    });
    expect(s.ageYears).toBe(36);
  });

  it("age one day before birthday → still 35", () => {
    // today is 2026-06-23, birthday 1990-06-24 → not yet 36
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: { ...baseCustomer, birthday: "1990-06-24" },
      history: baseHistory,
      finance: baseFinance,
      today,
    });
    expect(s.ageYears).toBe(35);
  });

  it("valueToDepositRatio computed correctly", () => {
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: baseCustomer,
      history: baseHistory,
      finance: { total_amount: 400, deposit: 200 },
      today,
    });
    expect(s.finance.valueToDepositRatio).toBeCloseTo(2);
  });

  it("deposit === 0 → valueToDepositRatio === null", () => {
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: baseCustomer,
      history: baseHistory,
      finance: { total_amount: 400, deposit: 0 },
      today,
    });
    expect(s.finance.valueToDepositRatio).toBeNull();
  });

  it("null customer → all docs/address/contact absent", () => {
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: null,
      history: baseHistory,
      finance: baseFinance,
      today,
    });
    expect(s.license.present).toBe(false);
    expect(s.idCard.present).toBe(false);
    expect(s.addressComplete).toBe(false);
    expect(s.contact.email).toBe(false);
    expect(s.contact.phone).toBe(false);
    expect(s.ageYears).toBeNull();
  });

  it("isReturningCustomer = true when priorContracts > 0", () => {
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: baseCustomer,
      history: { ...baseHistory, priorContracts: 1 },
      finance: baseFinance,
      today,
    });
    expect(s.history.isReturningCustomer).toBe(true);
  });

  it("isReturningCustomer = false when priorContracts === 0", () => {
    const s = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: baseCustomer,
      history: { ...baseHistory, priorContracts: 0 },
      finance: baseFinance,
      today,
    });
    expect(s.history.isReturningCustomer).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deriveHeuristicScore — the three required scenarios
// ---------------------------------------------------------------------------
describe("deriveHeuristicScore", () => {
  const today = new Date("2026-06-23");

  /**
   * Sauberer Stammkunde
   * - Führerschein vorhanden, gültig, Name passt
   * - Ausweis vorhanden
   * - 40 Jahre alt
   * - Adresse vollständig
   * - E-Mail + Telefon vorhanden
   * - 3 Verträge, 0 offene Zahlungen → Stammkunde-Bonus
   * - Kaution-Verhältnis ~2 (deposit 500, value 200)
   * Expected: gruen
   */
  it("sauberer Stammkunde → gruen", () => {
    const signals = assembleRiskSignals({
      renterName: "Max Mustermann",
      customer: {
        license_nr: "B123456789",
        license_photo_path: null,
        license_expiry: "2030-01-01",
        id_card_nr: "T22000129",
        id_card_photo_path: null,
        birthday: "1986-06-23", // 40 Jahre am 2026-06-23
        first_name: "Max",
        last_name: "Mustermann",
        company_name: null,
        street: "Hauptstraße 1",
        zip: "80331",
        city: "München",
        email: "max@example.com",
        phone: "+4989123456",
      },
      history: { priorContracts: 3, overdueUnpaid: 0, priorDamages: 0, openTickets: 0 },
      finance: { total_amount: 200, deposit: 500 },
      today,
    });
    const result = deriveHeuristicScore(signals);
    expect(result.level).toBe("gruen");
  });

  /**
   * Abgelaufener Führerschein + offene Zahlung
   * - Führerschein vorhanden ABER abgelaufen (+35)
   * - overdueUnpaid = 2 (+30)
   * → raw score ≥ 67 → rot
   */
  it("abgelaufener FS + offene Zahlung → rot", () => {
    const signals = assembleRiskSignals({
      renterName: "Rainer Zufall",
      customer: {
        license_nr: "X9999999",
        license_photo_path: null,
        license_expiry: "2020-01-01", // abgelaufen
        id_card_nr: null,
        id_card_photo_path: null,
        birthday: "1985-01-01",
        first_name: "Rainer",
        last_name: "Zufall",
        company_name: null,
        street: "Irgendwo 5",
        zip: "10115",
        city: "Berlin",
        email: "rainer@example.com",
        phone: "+4930999",
      },
      history: { priorContracts: 1, overdueUnpaid: 2, priorDamages: 0, openTickets: 0 },
      finance: { total_amount: 300, deposit: 300 },
      today,
    });
    const result = deriveHeuristicScore(signals);
    expect(result.level).toBe("rot");
  });

  /**
   * Junger Erst-Mieter ohne Historie
   * - Alter 20 → +20 (warn)
   * - Kein priorContracts → kein Stammkunden-Bonus
   * - Docs vorhanden + gültig → kein Penalty für FS
   * - Adresse + E-Mail + Telefon → kein Penalty
   * - deposit ratio ~3 → +8 (info, grenzwertig)
   * → score in gelb-Bereich [34..66]
   */
  it("junger Erst-Mieter ohne Historie → gelb (nicht rot)", () => {
    const signals = assembleRiskSignals({
      renterName: "Tim Jung",
      customer: {
        license_nr: "Y7777777",
        license_photo_path: null,
        license_expiry: "2030-01-01",
        id_card_nr: "A1234567",
        id_card_photo_path: null,
        birthday: "2006-06-23", // genau 20 am 2026-06-23
        first_name: "Tim",
        last_name: "Jung",
        company_name: null,
        street: "Jugendstraße 3",
        zip: "70173",
        city: "Stuttgart",
        email: "tim@example.com",
        phone: "+497111234",
      },
      history: { priorContracts: 0, overdueUnpaid: 0, priorDamages: 0, openTickets: 0 },
      finance: { total_amount: 350, deposit: 100 }, // ratio 3.5 → >3 → +8
      today,
    });
    const result = deriveHeuristicScore(signals);
    expect(result.level).toBe("gelb");
    expect(result.level).not.toBe("rot");
  });

  // Basic structural tests
  it("result has score, summary, factors", () => {
    const signals = assembleRiskSignals({
      renterName: null,
      customer: null,
      history: { priorContracts: 0, overdueUnpaid: 0, priorDamages: 0, openTickets: 0 },
      finance: { total_amount: null, deposit: null },
      today,
    });
    const result = deriveHeuristicScore(signals);
    expect(typeof result.score).toBe("number");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(typeof result.summary).toBe("string");
    expect(Array.isArray(result.factors)).toBe(true);
  });

  it("score is clamped to 0..100", () => {
    // Worst case: no docs, no address, no contact, overdue, openTickets etc.
    const signals = assembleRiskSignals({
      renterName: null,
      customer: null,
      history: { priorContracts: 0, overdueUnpaid: 5, priorDamages: 3, openTickets: 2 },
      finance: { total_amount: 1000, deposit: null },
      today,
    });
    const result = deriveHeuristicScore(signals);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeAiRisk
// ---------------------------------------------------------------------------
describe("normalizeAiRisk", () => {
  const heuristic: import("./risk").RiskResult = {
    level: "gelb",
    score: 50,
    summary: "Heuristik-Zusammenfassung.",
    factors: [{ label: "Heuristik-Faktor", severity: "warn" }],
  };

  it("valid AI output passes through — score rounded, level recomputed from score", () => {
    const raw = {
      score: 72.6,
      summary: "Führerschein abgelaufen.",
      factors: [{ label: "Führerschein abgelaufen", severity: "alarm", detail: "seit 2020" }],
    };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.score).toBe(73);           // Math.round(72.6)
    expect(result.level).toBe("rot");        // 73 >= 67
    expect(result.summary).toBe("Führerschein abgelaufen.");
    expect(result.factors[0].label).toBe("Führerschein abgelaufen");
    expect(result.factors[0].severity).toBe("alarm");
    expect(result.factors[0].detail).toBe("seit 2020");
  });

  it("garbage raw (string) → returns heuristic unchanged", () => {
    const result = normalizeAiRisk("nicht JSON", heuristic);
    expect(result).toEqual(heuristic);
  });

  it("empty object → all fields fall back to heuristic", () => {
    const result = normalizeAiRisk({}, heuristic);
    expect(result.score).toBe(heuristic.score);
    expect(result.level).toBe(heuristic.level);
    expect(result.summary).toBe(heuristic.summary);
    expect(result.factors).toEqual(heuristic.factors);
  });

  it("null raw → returns heuristic unchanged", () => {
    const result = normalizeAiRisk(null, heuristic);
    expect(result).toEqual(heuristic);
  });

  it("out-of-range score 999 → falls back to heuristic.score", () => {
    const raw = { score: 999, summary: "Zu hoch.", factors: [] };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.score).toBe(heuristic.score);
    expect(result.level).toBe(heuristic.level);
  });

  it("out-of-range score -5 → falls back to heuristic.score", () => {
    const raw = { score: -5, summary: "Negativ.", factors: [] };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.score).toBe(heuristic.score);
    expect(result.level).toBe(heuristic.level);
  });

  it("AI level gruen contradicting score 80 → level becomes rot (recomputed from score)", () => {
    // level field is ignored; we only pass score in the AI payload spec,
    // but normalizeAiRisk must handle an unexpected level key gracefully
    const raw = { score: 80, level: "gruen", summary: "Widerspruch.", factors: [] };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.score).toBe(80);
    expect(result.level).toBe("rot"); // derived from 80, not from raw.level
  });

  it("factor with invalid severity → coerced to info", () => {
    const raw = {
      score: 50,
      summary: "Test.",
      factors: [{ label: "Faktor", severity: "critical" }],
    };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.factors[0].severity).toBe("info");
  });

  it("factor without label → dropped", () => {
    const raw = {
      score: 50,
      summary: "Test.",
      factors: [
        { severity: "warn" },                              // no label → drop
        { label: "Gültiger Faktor", severity: "info" },
      ],
    };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.factors).toHaveLength(1);
    expect(result.factors[0].label).toBe("Gültiger Faktor");
  });

  it("more than 8 factors → only first 8 kept", () => {
    const raw = {
      score: 40,
      summary: "Viele Faktoren.",
      factors: Array.from({ length: 12 }, (_, i) => ({
        label: `Faktor ${i + 1}`,
        severity: "info",
      })),
    };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.factors).toHaveLength(8);
    expect(result.factors[0].label).toBe("Faktor 1");
    expect(result.factors[7].label).toBe("Faktor 8");
  });

  it("summary truncated to 300 chars", () => {
    const longSummary = "A".repeat(400);
    const raw = { score: 50, summary: longSummary, factors: [] };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.summary).toHaveLength(300);
  });

  it("empty summary string → falls back to heuristic.summary", () => {
    const raw = { score: 50, summary: "   ", factors: [] };
    const result = normalizeAiRisk(raw, heuristic);
    expect(result.summary).toBe(heuristic.summary);
  });
});
