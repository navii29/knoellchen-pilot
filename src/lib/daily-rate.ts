// EINE geteilte Preisregel: der effektive Tagespreis ist der Vertragspreis, wenn
// gesetzt (> 0), sonst der Fahrzeugpreis, wenn gesetzt (> 0), sonst null.
// An allen Stellen identisch nutzen (Verlängerungs-Schätzung, Vertragsanlage,
// Anzeige) — NICHT reimplementieren. 0/null/negativ/NaN/Müll gilt als „leer".

const positiveOrNull = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Fest verdrahteter Monats-Teiler für den Verlängerungs-/Rückgabe-Tagespreis.
// Bewusst 29 (nicht 30/30.44) — vereinbarte Konvention für Monatsmieten.
const MONTHLY_RATE_DIVISOR = 29;
const round2 = (n: number): number => Math.round(n * 100) / 100;

// Effektiver Tagespreis. Reihenfolge: Monatspreis (Vertrag, sonst Fahrzeug) ÷ 29
// — falls gesetzt, hat er VORRANG — sonst Tagespreis (Vertrag, sonst Fahrzeug).
// Die monthly-Felder sind OPTIONAL: Aufrufer, die sie NICHT übergeben (z. B. der
// Anlage-Flow, der den daily_rate speichert), behalten das reine Tages-Verhalten.
export const resolveEffectiveDailyRate = (input: {
  contractRate: number | string | null | undefined;
  vehicleRate: number | string | null | undefined;
  contractMonthlyRate?: number | string | null | undefined;
  vehicleMonthlyRate?: number | string | null | undefined;
}): number | null => {
  const monthly =
    positiveOrNull(input.contractMonthlyRate) ?? positiveOrNull(input.vehicleMonthlyRate);
  if (monthly != null) return round2(monthly / MONTHLY_RATE_DIVISOR);
  return positiveOrNull(input.contractRate) ?? positiveOrNull(input.vehicleRate) ?? null;
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
