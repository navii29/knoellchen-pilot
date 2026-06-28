// EINE geteilte Preisregel: der effektive Tagespreis ist der Vertragspreis, wenn
// gesetzt (> 0), sonst der Fahrzeugpreis, wenn gesetzt (> 0), sonst null.
// An allen Stellen identisch nutzen (Verlängerungs-Schätzung, Vertragsanlage,
// Anzeige) — NICHT reimplementieren. 0/null/negativ/NaN/Müll gilt als „leer".

const positiveOrNull = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const resolveEffectiveDailyRate = (input: {
  contractRate: number | string | null | undefined;
  vehicleRate: number | string | null | undefined;
}): number | null => {
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
