// Margenberechnung pro Fahrzeug + Flotten-Summe.
// Reine Funktionen — KEINE "use client"-Direktive, damit aus Server-
// Components und API-Routes aufrufbar.

import type { Contract, Vehicle } from "./types";

const startOfDay = (s: string | Date) => {
  const d = typeof s === "string" ? new Date(s) : new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export const periodDays = (from: string, to: string): number => {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
};

// Tage eines Vertrags, die innerhalb des Zeitraums liegen.
// Intersection von [pickup_date .. (actual_return_date | return_date)] mit [from .. to].
export const contractDaysInPeriod = (
  c: Pick<Contract, "pickup_date" | "return_date" | "actual_return_date">,
  from: string,
  to: string
): number => {
  if (!c.pickup_date) return 0;
  const pickup = startOfDay(c.pickup_date).getTime();
  const ret = startOfDay(c.actual_return_date ?? c.return_date).getTime();
  if (!Number.isFinite(pickup) || !Number.isFinite(ret) || ret < pickup) return 0;
  const periodStart = startOfDay(from).getTime();
  const periodEnd = startOfDay(to).getTime();
  const overlapStart = Math.max(pickup, periodStart);
  const overlapEnd = Math.min(ret, periodEnd);
  if (overlapEnd < overlapStart) return 0;
  return Math.round((overlapEnd - overlapStart) / 86_400_000) + 1;
};

// =====================================================
// Per-Vehicle-Marge im Zeitraum
// =====================================================
export type VehicleMargin = {
  vehicle_id: string;
  plate: string;
  label: string;
  cost_daily: number | null;
  target_daily_rate: number | null;
  period_days: number;
  rented_days: number;
  ek_total: number;
  soll_vk_total: number;
  ist_vk_total: number;
  margin_eur: number;
  margin_pct: number | null;
  utilization_pct: number;
};

type VehicleLite = Pick<
  Vehicle,
  | "id"
  | "plate"
  | "manufacturer"
  | "model"
  | "vehicle_type"
  | "cost_daily"
  | "cost_monthly"
  | "target_daily_rate"
  | "daily_rate"
>;

type ContractLite = Pick<
  Contract,
  | "id"
  | "plate"
  | "vehicle_id"
  | "pickup_date"
  | "return_date"
  | "actual_return_date"
  | "daily_rate"
  | "status"
>;

const buildLabel = (v: VehicleLite): string =>
  [v.manufacturer, v.model].filter(Boolean).join(" ") ||
  v.vehicle_type ||
  "Fahrzeug";

// Falls cost_daily nicht direkt gesetzt ist, leite es aus cost_monthly / 30 ab.
export const effectiveCostDaily = (v: VehicleLite): number | null => {
  if (v.cost_daily != null && Number(v.cost_daily) > 0)
    return Number(v.cost_daily);
  if (v.cost_monthly != null && Number(v.cost_monthly) > 0)
    return round2(Number(v.cost_monthly) / 30);
  return null;
};

export const computeVehicleMargin = (args: {
  vehicle: VehicleLite;
  contracts: ContractLite[];
  from: string;
  to: string;
}): VehicleMargin => {
  const { vehicle, contracts, from, to } = args;
  const days = periodDays(from, to);
  const costDaily = effectiveCostDaily(vehicle);
  const target = vehicle.target_daily_rate != null ? Number(vehicle.target_daily_rate) : null;

  let rentedDays = 0;
  let istVk = 0;
  for (const c of contracts) {
    if (c.status === "storniert") continue;
    const overlap = contractDaysInPeriod(c, from, to);
    if (overlap <= 0) continue;
    rentedDays += overlap;
    const rate = c.daily_rate != null ? Number(c.daily_rate) : 0;
    istVk += overlap * rate;
  }

  const ekTotal = costDaily != null ? days * costDaily : 0;
  const sollVk = target != null ? rentedDays * target : 0;
  const margin = istVk - ekTotal;
  const marginPct = istVk > 0 ? (margin / istVk) * 100 : null;
  const utilization = days > 0 ? (rentedDays / days) * 100 : 0;

  return {
    vehicle_id: vehicle.id,
    plate: vehicle.plate,
    label: buildLabel(vehicle),
    cost_daily: costDaily,
    target_daily_rate: target,
    period_days: days,
    rented_days: rentedDays,
    ek_total: round2(ekTotal),
    soll_vk_total: round2(sollVk),
    ist_vk_total: round2(istVk),
    margin_eur: round2(margin),
    margin_pct: marginPct != null ? round2(marginPct) : null,
    utilization_pct: round2(utilization),
  };
};

// =====================================================
// Flotten-Summe
// =====================================================
export type FleetMargin = {
  from: string;
  to: string;
  period_days: number;
  vehicle_count: number;
  total_rented_days: number;
  total_possible_days: number;
  total_ek: number;
  total_soll_vk: number;
  total_ist_vk: number;
  total_margin: number;
  total_margin_pct: number | null;
  avg_utilization_pct: number;
  vehicles: VehicleMargin[];
};

export const computeFleetMargin = (args: {
  vehicles: VehicleLite[];
  contracts: ContractLite[];
  from: string;
  to: string;
}): FleetMargin => {
  const { vehicles, contracts, from, to } = args;
  const days = periodDays(from, to);

  // Verträge nach vehicle_id oder plate auf Fahrzeuge mappen
  const byVehicleId = new Map<string, ContractLite[]>();
  const byPlate = new Map<string, ContractLite[]>();
  for (const c of contracts) {
    if (c.vehicle_id) {
      const arr = byVehicleId.get(c.vehicle_id) ?? [];
      arr.push(c);
      byVehicleId.set(c.vehicle_id, arr);
    }
    if (c.plate) {
      const arr = byPlate.get(c.plate) ?? [];
      arr.push(c);
      byPlate.set(c.plate, arr);
    }
  }

  const perVehicle = vehicles.map((v) => {
    const linked = byVehicleId.get(v.id) ?? byPlate.get(v.plate) ?? [];
    return computeVehicleMargin({ vehicle: v, contracts: linked, from, to });
  });

  const total_rented_days = perVehicle.reduce((s, x) => s + x.rented_days, 0);
  const total_possible_days = days * vehicles.length;
  const total_ek = perVehicle.reduce((s, x) => s + x.ek_total, 0);
  const total_soll_vk = perVehicle.reduce((s, x) => s + x.soll_vk_total, 0);
  const total_ist_vk = perVehicle.reduce((s, x) => s + x.ist_vk_total, 0);
  const total_margin = total_ist_vk - total_ek;
  const total_margin_pct =
    total_ist_vk > 0 ? (total_margin / total_ist_vk) * 100 : null;
  const avg_utilization_pct =
    total_possible_days > 0
      ? (total_rented_days / total_possible_days) * 100
      : 0;

  // Sortierung: Marge absteigend (beste zuerst)
  perVehicle.sort((a, b) => b.margin_eur - a.margin_eur);

  return {
    from,
    to,
    period_days: days,
    vehicle_count: vehicles.length,
    total_rented_days,
    total_possible_days,
    total_ek: round2(total_ek),
    total_soll_vk: round2(total_soll_vk),
    total_ist_vk: round2(total_ist_vk),
    total_margin: round2(total_margin),
    total_margin_pct:
      total_margin_pct != null ? round2(total_margin_pct) : null,
    avg_utilization_pct: round2(avg_utilization_pct),
    vehicles: perVehicle,
  };
};

// =====================================================
// Farbcodes
// =====================================================
export const marginColor = (
  marginEur: number
): { bg: string; ring: string; text: string; color: string } =>
  marginEur >= 0
    ? {
        bg: "#f0fdf4",
        ring: "#bbf7d0",
        text: "#15803d",
        color: "#16a34a",
      }
    : {
        bg: "#fef2f2",
        ring: "#fecaca",
        text: "#b91c1c",
        color: "#dc2626",
      };

export type UtilLevel = "low" | "mid" | "high";

export const utilizationLevel = (pct: number): UtilLevel => {
  if (pct >= 70) return "high";
  if (pct >= 40) return "mid";
  return "low";
};

export const UTIL_META: Record<
  UtilLevel,
  { bg: string; ring: string; text: string; color: string }
> = {
  high: { bg: "#f0fdf4", ring: "#bbf7d0", text: "#15803d", color: "#16a34a" },
  mid: { bg: "#fefce8", ring: "#fde68a", text: "#a16207", color: "#ca8a04" },
  low: { bg: "#fef2f2", ring: "#fecaca", text: "#b91c1c", color: "#dc2626" },
};

// =====================================================
// Periodische Vorgaben
// =====================================================
export const lastNDaysIso = (n: number): { from: string; to: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - (n - 1));
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
};

export const previousPeriodIso = (
  from: string,
  to: string
): { from: string; to: string } => {
  const days = periodDays(from, to);
  const start = startOfDay(from);
  const prevTo = new Date(start);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  };
};
