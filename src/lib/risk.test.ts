import { describe, it, expect } from "vitest";
import {
  levelFromScore,
  assembleRiskSignals,
  deriveHeuristicScore,
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
