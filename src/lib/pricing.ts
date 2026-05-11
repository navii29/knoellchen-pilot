import type { PricingRule, PricingRuleType, Vehicle } from "./types";

export type PriceAdjustment = {
  rule_id: string;
  rule_name: string;
  rule_type: PricingRuleType;
  percent: number;
  amount_eur: number;
};

export type PriceRecommendation = {
  base_price: number;
  base_source: "vehicle.base_daily_rate" | "vehicle.daily_rate" | "fallback";
  date: string; // ISO YYYY-MM-DD
  adjustments: PriceAdjustment[];
  total_percent: number;
  final_price: number;
  free_fleet_count: number | null;
  total_fleet_count: number | null;
  explanation: string;
};

const startOfDay = (s: string | Date) => {
  const d = typeof s === "string" ? new Date(s) : new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const getBasePrice = (
  vehicle: Pick<Vehicle, "base_daily_rate" | "daily_rate">
): { value: number; source: PriceRecommendation["base_source"] } => {
  if (vehicle.base_daily_rate != null && Number(vehicle.base_daily_rate) > 0) {
    return { value: Number(vehicle.base_daily_rate), source: "vehicle.base_daily_rate" };
  }
  if (vehicle.daily_rate != null && Number(vehicle.daily_rate) > 0) {
    return { value: Number(vehicle.daily_rate), source: "vehicle.daily_rate" };
  }
  return { value: 0, source: "fallback" };
};

const ruleAppliesOnDate = (
  rule: PricingRule,
  date: Date,
  freeFleetCount: number | null
): boolean => {
  if (!rule.active) return false;
  switch (rule.type) {
    case "season": {
      if (!rule.start_date || !rule.end_date) return false;
      const start = startOfDay(rule.start_date);
      const end = startOfDay(rule.end_date);
      return date >= start && date <= end;
    }
    case "weekday": {
      if (!rule.weekdays || rule.weekdays.length === 0) return false;
      // JS getDay: 0=So, 1=Mo, …, 6=Sa
      // Konvention im Schema: 1=Mo, …, 7=So (ISO 8601)
      const iso = date.getDay() === 0 ? 7 : date.getDay();
      return rule.weekdays.includes(iso);
    }
    case "demand": {
      if (rule.min_fleet_available == null) return false;
      if (freeFleetCount == null) return false;
      return freeFleetCount < rule.min_fleet_available;
    }
    case "custom":
      // Custom-Regeln gelten immer (für Pauschal-Aufschläge oder -Rabatte)
      return true;
    default:
      return false;
  }
};

const fmtPercent = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(0).replace(".", ",")}%`;

export const calculateOptimalPrice = (args: {
  vehicle: Pick<Vehicle, "base_daily_rate" | "daily_rate">;
  date: string; // ISO YYYY-MM-DD
  rules: PricingRule[];
  freeFleetCount?: number | null;
  totalFleetCount?: number | null;
}): PriceRecommendation => {
  const { vehicle, date, rules } = args;
  const free = args.freeFleetCount ?? null;
  const total = args.totalFleetCount ?? null;

  const base = getBasePrice(vehicle);
  const day = startOfDay(date);
  const dateIso = day.toISOString().slice(0, 10);

  const adjustments: PriceAdjustment[] = [];
  for (const rule of rules) {
    if (!ruleAppliesOnDate(rule, day, free)) continue;
    const percent = Number(rule.adjustment_percent);
    if (!Number.isFinite(percent) || percent === 0) continue;
    const amount = round2((base.value * percent) / 100);
    adjustments.push({
      rule_id: rule.id,
      rule_name: rule.name,
      rule_type: rule.type,
      percent,
      amount_eur: amount,
    });
  }

  const totalPercent = adjustments.reduce((s, a) => s + a.percent, 0);
  const finalPrice = round2(base.value + (base.value * totalPercent) / 100);

  const explanationParts: string[] = [];
  explanationParts.push(`Basispreis ${base.value.toFixed(2).replace(".", ",")}€`);
  for (const a of adjustments) {
    explanationParts.push(`${a.rule_name} ${fmtPercent(a.percent)}`);
  }
  const explanation = explanationParts.join(" · ");

  return {
    base_price: base.value,
    base_source: base.source,
    date: dateIso,
    adjustments,
    total_percent: round2(totalPercent),
    final_price: finalPrice,
    free_fleet_count: free,
    total_fleet_count: total,
    explanation,
  };
};

// =====================================================
// Mehrtagiger Mietzeitraum: Preise pro Tag berechnen
// und gewichtet mitteln.
// =====================================================
export const calculatePeriodAverage = (args: {
  vehicle: Pick<Vehicle, "base_daily_rate" | "daily_rate">;
  pickupDate: string;
  returnDate: string;
  rules: PricingRule[];
  freeFleetByDate?: Map<string, number>;
  totalFleetCount?: number | null;
}): {
  per_day: PriceRecommendation[];
  average_daily_price: number;
  total_price: number;
  days: number;
  explanation: string;
} => {
  const { vehicle, pickupDate, returnDate, rules } = args;
  const start = startOfDay(pickupDate);
  const end = startOfDay(returnDate);
  if (end < start) {
    return {
      per_day: [],
      average_daily_price: 0,
      total_price: 0,
      days: 0,
      explanation: "Ungültiger Zeitraum",
    };
  }
  const per_day: PriceRecommendation[] = [];
  for (
    let d = new Date(start);
    d.getTime() <= end.getTime();
    d.setDate(d.getDate() + 1)
  ) {
    const iso = d.toISOString().slice(0, 10);
    const free = args.freeFleetByDate?.get(iso) ?? null;
    per_day.push(
      calculateOptimalPrice({
        vehicle,
        date: iso,
        rules,
        freeFleetCount: free,
        totalFleetCount: args.totalFleetCount ?? null,
      })
    );
  }
  const days = per_day.length;
  const total = per_day.reduce((s, r) => s + r.final_price, 0);
  const avg = round2(total / Math.max(1, days));

  // Erklärung: konsolidiere alle eindeutigen Regeln über den Zeitraum
  const allRuleNames = new Map<string, { percent: number; days: number }>();
  for (const day of per_day) {
    for (const a of day.adjustments) {
      const existing = allRuleNames.get(a.rule_name);
      if (existing) existing.days += 1;
      else allRuleNames.set(a.rule_name, { percent: a.percent, days: 1 });
    }
  }
  const basePart =
    per_day[0]?.base_price != null
      ? `Basispreis ${per_day[0].base_price.toFixed(2).replace(".", ",")}€`
      : "Basispreis";
  const ruleParts = Array.from(allRuleNames.entries()).map(
    ([name, { percent, days: ruleDays }]) => {
      const allDays = ruleDays === days;
      return `${name} ${fmtPercent(percent)}${allDays ? "" : ` (${ruleDays}/${days} Tagen)`}`;
    }
  );
  const explanation = [basePart, ...ruleParts].join(" · ");

  return {
    per_day,
    average_daily_price: avg,
    total_price: round2(total),
    days,
    explanation,
  };
};

// =====================================================
// Farbschema fürs UI
// =====================================================
export const priceLevel = (
  totalPercent: number
): "discount" | "normal" | "elevated" | "high" => {
  if (totalPercent < 0) return "discount";
  if (totalPercent === 0) return "normal";
  if (totalPercent <= 15) return "elevated";
  return "high";
};

export const PRICE_LEVEL_META: Record<
  ReturnType<typeof priceLevel>,
  { label: string; bg: string; ring: string; text: string; dot: string }
> = {
  discount: {
    label: "Rabatt",
    bg: "#eff6ff",
    ring: "#bfdbfe",
    text: "#1d4ed8",
    dot: "#2563eb",
  },
  normal: {
    label: "Normalpreis",
    bg: "#f0fdf4",
    ring: "#bbf7d0",
    text: "#15803d",
    dot: "#16a34a",
  },
  elevated: {
    label: "Leicht erhöht",
    bg: "#fefce8",
    ring: "#fde68a",
    text: "#a16207",
    dot: "#ca8a04",
  },
  high: {
    label: "Stark erhöht",
    bg: "#fef2f2",
    ring: "#fecaca",
    text: "#b91c1c",
    dot: "#dc2626",
  },
};
