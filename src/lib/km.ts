// Branchenstandard Autovermietung: 1 Monat = 30 Tage für Inklusivkilometer
export const DAYS_PER_MONTH = 30;
const DAY_MS = 86_400_000;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round = (n: number) => Math.round(n);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const daysBetween = (from: string, to: string): number => {
  const f = startOfDay(new Date(from));
  const t = startOfDay(new Date(to));
  return Math.round((t.getTime() - f.getTime()) / DAY_MS);
};

// =========================
// Alte API (Backwards-Compat) — Limit ist TOTAL erlaubte km
// =========================
export type ExtraKmInput = {
  kmPickup: number | null | undefined;
  kmReturn: number | null | undefined;
  kmLimit: number | null | undefined;
  pricePerKm: number | null | undefined;
};

export type ExtraKmResult = {
  drivenKm: number;
  withinLimit: boolean;
  extraKm: number;
  pricePerKm: number;
  cost: number;
};

export const computeExtraKm = (input: ExtraKmInput): ExtraKmResult | null => {
  const pickup = Number(input.kmPickup ?? NaN);
  const ret = Number(input.kmReturn ?? NaN);
  if (!Number.isFinite(pickup) || !Number.isFinite(ret)) return null;
  if (ret < pickup) return null;

  const drivenKm = ret - pickup;
  const limit = Number(input.kmLimit ?? NaN);
  const price = Number(input.pricePerKm ?? NaN);

  if (!Number.isFinite(limit) || !Number.isFinite(price) || price <= 0) {
    return {
      drivenKm,
      withinLimit: true,
      extraKm: 0,
      pricePerKm: Number.isFinite(price) ? price : 0,
      cost: 0,
    };
  }

  const extraKm = Math.max(0, drivenKm - limit);
  return {
    drivenKm,
    withinLimit: extraKm === 0,
    extraKm,
    pricePerKm: price,
    cost: round2(extraKm * price),
  };
};

// =========================
// Rückgabe-Berechnung (taggenau, Inklusivkilometer pro Monat)
// =========================
export type ReturnSummaryInput = {
  pickupDate: string;             // ISO YYYY-MM-DD
  plannedReturnDate: string;      // ISO YYYY-MM-DD
  actualReturnDate: string;       // ISO YYYY-MM-DD
  kmPickup: number | null | undefined;
  kmReturn: number | null | undefined;
  // Quellen für die erlaubten km (Priorität: kmLimitOverride > inclusiveKmMonth)
  inclusiveKmMonth: number | null | undefined;
  kmLimitOverride: number | null | undefined; // optional: festes Limit am Vertrag
  pricePerKm: number | null | undefined;
};

export type ReturnSummary = {
  // Tage
  plannedDays: number;          // (plannedReturn - pickup), min 1
  actualDays: number;           // (actualReturn - pickup), min 1
  daysDiff: number;             // actualDays - plannedDays  (negativ = früher zurück)

  // Kilometer
  kmPickup: number | null;
  kmReturn: number | null;
  drivenKm: number | null;      // kmReturn - kmPickup oder null wenn unvollständig

  // Erlaubt
  inclusiveKmMonth: number | null;
  source: "override" | "inclusive_month" | "none";
  allowedKm: number | null;     // null = unbegrenzt

  // Mehrkilometer
  excessKm: number;             // 0 wenn allowedKm null oder driven <= allowedKm
  pricePerKm: number;
  cost: number;                 // round2(excessKm * pricePerKm)
};

const computeAllowed = (
  actualDays: number,
  inclusiveKmMonth: number | null | undefined,
  kmLimitOverride: number | null | undefined
): { allowed: number | null; source: ReturnSummary["source"] } => {
  if (kmLimitOverride != null && Number.isFinite(Number(kmLimitOverride))) {
    return { allowed: round(Number(kmLimitOverride)), source: "override" };
  }
  if (inclusiveKmMonth != null && Number.isFinite(Number(inclusiveKmMonth))) {
    const monthly = Number(inclusiveKmMonth);
    return { allowed: round((actualDays / DAYS_PER_MONTH) * monthly), source: "inclusive_month" };
  }
  return { allowed: null, source: "none" };
};

export const computeReturnSummary = (input: ReturnSummaryInput): ReturnSummary => {
  const plannedDays = Math.max(1, daysBetween(input.pickupDate, input.plannedReturnDate));
  const actualDays = Math.max(1, daysBetween(input.pickupDate, input.actualReturnDate));
  const daysDiff = actualDays - plannedDays;

  const pickup = input.kmPickup != null && Number.isFinite(Number(input.kmPickup))
    ? Number(input.kmPickup)
    : null;
  const ret = input.kmReturn != null && Number.isFinite(Number(input.kmReturn))
    ? Number(input.kmReturn)
    : null;
  const drivenKm = pickup != null && ret != null && ret >= pickup ? ret - pickup : null;

  const { allowed, source } = computeAllowed(
    actualDays,
    input.inclusiveKmMonth,
    input.kmLimitOverride
  );

  const price = input.pricePerKm != null && Number.isFinite(Number(input.pricePerKm))
    ? Number(input.pricePerKm)
    : 0;

  const excessKm =
    drivenKm != null && allowed != null
      ? Math.max(0, drivenKm - allowed)
      : 0;
  const cost = round2(excessKm * price);

  return {
    plannedDays,
    actualDays,
    daysDiff,
    kmPickup: pickup,
    kmReturn: ret,
    drivenKm,
    inclusiveKmMonth:
      input.inclusiveKmMonth != null && Number.isFinite(Number(input.inclusiveKmMonth))
        ? Number(input.inclusiveKmMonth)
        : null,
    source,
    allowedKm: allowed,
    excessKm,
    pricePerKm: price,
    cost,
  };
};
