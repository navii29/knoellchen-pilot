/**
 * risk.ts — Deterministischer Risikocheck für den Self-Check-in.
 * PURE: keine DB-Aufrufe, kein Netzwerk, keine KI.
 */

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export type RiskLevel = "gruen" | "gelb" | "rot";

export type RiskFactor = {
  label: string;             // kurzer deutscher Titel
  severity: "info" | "warn" | "alarm";
  detail?: string;
};

export type RiskSignals = {
  license: {
    present: boolean;
    valid: boolean | null;             // null = kein Ablaufdatum vorhanden
    nameMatchesRenter: boolean | null; // null = ein Seite fehlt
  };
  idCard: { present: boolean };
  ageYears: number | null;
  addressComplete: boolean;
  contact: { email: boolean; phone: boolean };
  history: {
    priorContracts: number;
    overdueUnpaid: number;
    priorDamages: number;
    openTickets: number;
    isReturningCustomer: boolean;
  };
  finance: {
    rentalValue: number | null;
    deposit: number | null;
    valueToDepositRatio: number | null;
  };
};

export type RiskResult = {
  level: RiskLevel;
  score: number;      // 0..100, höher = riskanter
  summary: string;    // 1 kurzer deutscher Satz
  factors: RiskFactor[];
};

// ---------------------------------------------------------------------------
// Schwellwerte & Hilfsfunktionen
// ---------------------------------------------------------------------------

export const RISK_THRESHOLDS = { rot: 67, gelb: 34 } as const;

export const levelFromScore = (score: number): RiskLevel =>
  score >= RISK_THRESHOLDS.rot
    ? "rot"
    : score >= RISK_THRESHOLDS.gelb
      ? "gelb"
      : "gruen";

// ---------------------------------------------------------------------------
// assembleRiskSignals — berechnet Signale aus bereits geladenen Daten
// ---------------------------------------------------------------------------

type CustomerInput = {
  license_nr: string | null;
  license_photo_path: string | null;
  license_expiry: string | null;
  id_card_nr: string | null;
  id_card_photo_path: string | null;
  birthday: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name?: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
} | null;

type AssembleInput = {
  renterName: string | null;
  customer: CustomerInput;
  history: {
    priorContracts: number;
    overdueUnpaid: number;
    priorDamages: number;
    openTickets: number;
  };
  finance: { total_amount: number | null; deposit: number | null };
  today?: Date;
};

function computeAgeYears(birthday: string, today: Date): number {
  const dob = new Date(birthday);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Lockerer Namensvergleich: beide Seiten müssen das letzte Token der jeweils
 * anderen Seite enthalten (case-insensitive, trimmed).
 */
function namesLooselyMatch(a: string, b: string): boolean {
  const tokenize = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const lastA = tokensA[tokensA.length - 1];
  const lastB = tokensB[tokensB.length - 1];

  return (
    b.toLowerCase().includes(lastA) && a.toLowerCase().includes(lastB)
  );
}

export function assembleRiskSignals(input: AssembleInput): RiskSignals {
  const { renterName, customer, history, finance, today = new Date() } = input;

  // --- Führerschein ---
  const licensePresent = !!(
    customer?.license_nr?.trim() || customer?.license_photo_path?.trim()
  );

  let licenseValid: boolean | null = null;
  if (licensePresent && customer?.license_expiry) {
    const expiry = new Date(customer.license_expiry);
    licenseValid = !isNaN(expiry.getTime()) && expiry >= today;
  }

  let nameMatchesRenter: boolean | null = null;
  if (customer && renterName) {
    const customerName =
      customer.company_name?.trim() ||
      [customer.first_name, customer.last_name].filter(Boolean).join(" ");
    if (customerName) {
      nameMatchesRenter = namesLooselyMatch(customerName, renterName);
    }
  }

  // --- Ausweis ---
  const idCardPresent = !!(
    customer?.id_card_nr?.trim() || customer?.id_card_photo_path?.trim()
  );

  // --- Alter ---
  let ageYears: number | null = null;
  if (customer?.birthday) {
    const age = computeAgeYears(customer.birthday, today);
    if (!isNaN(age)) ageYears = age;
  }

  // --- Adresse ---
  const addressComplete = !!(
    customer?.street?.trim() &&
    customer?.zip?.trim() &&
    customer?.city?.trim()
  );

  // --- Kontakt ---
  const emailPresent = !!(customer?.email?.trim());
  const phonePresent = !!(customer?.phone?.trim());

  // --- Finance ---
  const rentalValue = finance.total_amount ?? null;
  const deposit = finance.deposit ?? null;
  const valueToDepositRatio =
    deposit !== null && deposit > 0 && rentalValue !== null
      ? rentalValue / deposit
      : null;

  return {
    license: {
      present: licensePresent,
      valid: licenseValid,
      nameMatchesRenter,
    },
    idCard: { present: idCardPresent },
    ageYears,
    addressComplete,
    contact: { email: emailPresent, phone: phonePresent },
    history: {
      priorContracts: history.priorContracts,
      overdueUnpaid: history.overdueUnpaid,
      priorDamages: history.priorDamages,
      openTickets: history.openTickets,
      isReturningCustomer: history.priorContracts > 0,
    },
    finance: { rentalValue, deposit, valueToDepositRatio },
  };
}

// ---------------------------------------------------------------------------
// deriveHeuristicScore — deterministisch, additive Gewichtung
// ---------------------------------------------------------------------------

export function deriveHeuristicScore(signals: RiskSignals): RiskResult {
  const factors: RiskFactor[] = [];
  let score = 0;

  // --- Führerschein ---
  if (!signals.license.present) {
    score += 40;
    factors.push({ label: "Führerschein fehlt", severity: "alarm" });
  } else {
    if (signals.license.valid === false) {
      score += 35;
      factors.push({ label: "Führerschein abgelaufen", severity: "alarm" });
    }
    if (signals.license.nameMatchesRenter === false) {
      score += 15;
      factors.push({
        label: "Name stimmt nicht mit Führerschein überein",
        severity: "warn",
      });
    }
  }

  // --- Ausweis ---
  if (!signals.idCard.present) {
    score += 10;
    factors.push({ label: "Personalausweis fehlt", severity: "warn" });
  }

  // --- Alter ---
  if (signals.ageYears !== null) {
    if (signals.ageYears < 21) {
      score += 20;
      factors.push({
        label: "Fahrer unter 21 Jahren",
        severity: "warn",
        detail: `Alter: ${signals.ageYears} Jahre`,
      });
    } else if (signals.ageYears < 25) {
      score += 10;
      factors.push({
        label: "Fahrer unter 25 Jahren",
        severity: "info",
        detail: `Alter: ${signals.ageYears} Jahre`,
      });
    }
  }

  // --- Adresse ---
  if (!signals.addressComplete) {
    score += 10;
    factors.push({ label: "Adresse unvollständig", severity: "warn" });
  }

  // --- Kontakt ---
  const { email, phone } = signals.contact;
  if (!email && !phone) {
    score += 15;
    factors.push({ label: "Kein Kontakt hinterlegt", severity: "warn" });
  } else if (!email || !phone) {
    score += 5;
    factors.push({
      label: "Nur ein Kontaktweg vorhanden",
      severity: "info",
    });
  }

  // --- Historie ---
  if (signals.history.overdueUnpaid > 0) {
    score += 30;
    factors.push({
      label: "Offene/überfällige Zahlungen",
      severity: "alarm",
      detail: `${signals.history.overdueUnpaid} offen`,
    });
  }
  if (signals.history.priorDamages > 0) {
    score += 10;
    factors.push({
      label: "Frühere Schäden",
      severity: "info",
      detail: `${signals.history.priorDamages} Schadensfall(e)`,
    });
  }
  if (signals.history.openTickets > 0) {
    score += 10;
    factors.push({
      label: "Offene Strafzettel",
      severity: "warn",
      detail: `${signals.history.openTickets} offen`,
    });
  }

  // --- Stammkunde-Bonus (nur wenn keine offenen Zahlungen) ---
  if (
    signals.history.isReturningCustomer &&
    signals.history.overdueUnpaid === 0
  ) {
    score -= 15;
    factors.push({
      label: "Stammkunde ohne offene Posten",
      severity: "info",
      detail: `${signals.history.priorContracts} Vertrag/Verträge`,
    });
  } else if (!signals.history.isReturningCustomer) {
    // Kein Erfahrungswert vorhanden
    score += 8;
    factors.push({ label: "Erstmieter — keine Vorerfahrung", severity: "info" });
  }

  // --- Kaution / Wert-Verhältnis ---
  if (signals.finance.deposit === null || signals.finance.deposit === 0) {
    score += 15;
    factors.push({ label: "Keine Kaution hinterlegt", severity: "warn" });
  } else if (signals.finance.valueToDepositRatio !== null) {
    if (signals.finance.valueToDepositRatio > 5) {
      score += 15;
      factors.push({
        label: "Mietwert deutlich höher als Kaution",
        severity: "warn",
        detail: `Verhältnis ${signals.finance.valueToDepositRatio.toFixed(1)}x`,
      });
    } else if (signals.finance.valueToDepositRatio > 3) {
      score += 8;
      factors.push({
        label: "Mietwert höher als Kaution",
        severity: "info",
        detail: `Verhältnis ${signals.finance.valueToDepositRatio.toFixed(1)}x`,
      });
    }
  }

  // --- Klemme auf 0..100 ---
  const clampedScore = Math.min(100, Math.max(0, score));
  const level = levelFromScore(clampedScore);

  // --- Zusammenfassung ---
  const alarmFactors = factors.filter((f) => f.severity === "alarm");
  const warnFactors = factors.filter((f) => f.severity === "warn");

  let summary: string;
  if (level === "gruen" && alarmFactors.length === 0 && warnFactors.length === 0) {
    summary = "Keine Auffälligkeiten.";
  } else {
    const top = [...alarmFactors, ...warnFactors].slice(0, 2);
    if (top.length > 0) {
      summary = top.map((f) => f.label).join(", ") + ".";
    } else {
      summary = "Keine Auffälligkeiten.";
    }
  }

  return { level, score: clampedScore, summary, factors };
}
