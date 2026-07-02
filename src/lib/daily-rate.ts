// EINE geteilte Preisregel: der effektive Tagespreis ist der Vertragspreis, wenn
// gesetzt (> 0), sonst der Fahrzeugpreis, wenn gesetzt (> 0), sonst null.
// An allen Stellen identisch nutzen (Verlängerungs-Schätzung, Vertragsanlage,
// Anzeige) — NICHT reimplementieren. 0/null/negativ/NaN/Müll gilt als „leer".

const positiveOrNull = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Fest verdrahtete Teiler für den Verlängerungs-/Rückgabe-Tagespreis.
// Monat bewusst 29 (nicht 30/30.44) — vereinbarte Konvention für Monatsmieten.
// Woche analog 7.
const MONTHLY_RATE_DIVISOR = 29;
const WEEKLY_RATE_DIVISOR = 7;
const round2 = (n: number): number => Math.round(n * 100) / 100;

// Effektiver Tagespreis. Der Vertrag trägt seit der Abrechnungsmodell-
// Umstellung genau EINEN Preis (das gewählte Modell) — deshalb gilt:
//   1. VERTRAGSPREIS zuerst (Monat ÷ 29 > Woche ÷ 7 > Tag — der Vorrang regelt
//      nur noch Alt-Verträge, die mehrere Preise tragen),
//   2. FAHRZEUGPREIS nur als Fallback, wenn der Vertrag GAR keinen Preis hat
//      (gleiche Modell-Reihenfolge).
// Früher (bis #143-Welt) übersteuerte ein Fahrzeug-Monatspreis den Vertrags-
// Tagespreis — das ist bewusst ABGESCHAFFT: die Fahrzeugpreise sind eine
// Preisliste, der Vertragspreis ist die Abmachung. Die monthly/weekly-Felder
// sind OPTIONAL: Aufrufer ohne sie behalten das reine Tages-Verhalten.
export const resolveEffectiveDailyRate = (input: {
  contractRate: number | string | null | undefined;
  vehicleRate: number | string | null | undefined;
  contractMonthlyRate?: number | string | null | undefined;
  vehicleMonthlyRate?: number | string | null | undefined;
  contractWeeklyRate?: number | string | null | undefined;
  vehicleWeeklyRate?: number | string | null | undefined;
}): number | null => {
  const fromRates = (
    monthly: number | string | null | undefined,
    weekly: number | string | null | undefined,
    daily: number | string | null | undefined
  ): number | null => {
    const m = positiveOrNull(monthly);
    if (m != null) return round2(m / MONTHLY_RATE_DIVISOR);
    const w = positiveOrNull(weekly);
    if (w != null) return round2(w / WEEKLY_RATE_DIVISOR);
    return positiveOrNull(daily);
  };
  return (
    fromRates(input.contractMonthlyRate, input.contractWeeklyRate, input.contractRate) ??
    fromRates(input.vehicleMonthlyRate, input.vehicleWeeklyRate, input.vehicleRate)
  );
};

// =====================================================
// Abrechnungsmodell (Tag/Woche/Monat) aus dem Mietzeitraum ableiten.
// Konvention (Fridolin, 2026-07): >= 29 Tage Monat, >= 7 Tage Woche, sonst Tag.
// Der Vertrag trägt danach NUR den Preis des gewählten Modells; das PDF zeigt
// diesen Preis statt eines Gesamtbetrags (der Zeitraum steht im Vertrag).
// =====================================================
export type BillingModel = "daily" | "weekly" | "monthly";

export const deriveBillingModel = (days: number): BillingModel =>
  days >= 29 ? "monthly" : days >= 7 ? "weekly" : "daily";

export const BILLING_MODEL_LABEL: Record<BillingModel, string> = {
  daily: "Tagespreis",
  weekly: "Wochenmiete",
  monthly: "Monatsmiete",
};

/**
 * Modell + Preis für einen Zeitraum wählen: das abgeleitete Modell, wenn dafür
 * ein Preis (> 0) vorliegt — sonst Fallback in der Reihenfolge Tag → Woche →
 * Monat (das erste Modell mit Preis). Ohne jeden Preis: abgeleitetes Modell mit
 * rate null (Operator trägt selbst ein).
 */
export const resolveBillingSelection = (
  days: number,
  rates: {
    daily: number | string | null | undefined;
    weekly: number | string | null | undefined;
    monthly: number | string | null | undefined;
  }
): { model: BillingModel; rate: number | null } => {
  const derived = deriveBillingModel(days);
  const order: BillingModel[] = [derived, "daily", "weekly", "monthly"];
  for (const model of order) {
    const rate = positiveOrNull(rates[model]);
    if (rate != null) return { model, rate };
  }
  return { model: derived, rate: null };
};

/** Effektiver Tagessatz für EIN Modell (Monat ÷ 29, Woche ÷ 7, Tag pur). */
export const dailyRateForModel = (
  model: BillingModel,
  rate: number | string | null | undefined
): number | null => {
  const r = positiveOrNull(rate);
  if (r == null) return null;
  if (model === "monthly") return round2(r / MONTHLY_RATE_DIVISOR);
  if (model === "weekly") return round2(r / WEEKLY_RATE_DIVISOR);
  return r;
};

// Geschätzte Zusatzkosten einer Verlängerung: extra_days × effektiver Tagespreis,
// auf Cent gerundet. null, wenn Tage oder Preis fehlen (z. B. kein Tagespreis
// hinterlegt) — der Aufrufer zeigt dann einen Hinweis statt 0,00 €.
export const estimateExtensionCost = (input: {
  extraDays: number | null | undefined;
  rate: number | null | undefined;
}): number | null => {
  const { extraDays, rate } = input;
  if (extraDays == null || rate == null) return null;
  if (!Number.isFinite(extraDays) || !Number.isFinite(rate)) return null;
  return Math.round(extraDays * rate * 100) / 100;
};
