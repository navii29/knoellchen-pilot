import type { Vehicle } from "./types";

export type DecommissionLevel = "ok" | "soon" | "warn" | "urgent" | "due";

export type DecommissionInfo = {
  daysLeft: number | null;
  level: DecommissionLevel;
  label: string;
  color: string;
  textColor: string;
  bg: string;
  ring: string;
};

// Tagesdifferenz TZ-sicher: beide Daten als reine Kalendertage (UTC-Mitternacht)
// interpretieren. `new Date("YYYY-MM-DD")` ist bereits UTC-Mitternacht; das
// heutige Datum wird aus den LOKALEN Komponenten gebildet und ebenfalls als
// UTC-Mitternacht angesetzt, damit ein lokaler vs. UTC-Versatz keinen Tag
// verschiebt. Liefert null, wenn das Zieldatum kein gültiges YYYY-MM-DD ist.
const daysUntil = (dateOnly: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  const target = Date.parse(`${dateOnly}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - todayUtc) / 86_400_000);
};

export const computeDecommission = (vehicle: Pick<Vehicle, "decommission_date">): DecommissionInfo => {
  const date = vehicle.decommission_date;
  if (!date) {
    return {
      daysLeft: null,
      level: "ok",
      label: "Keine Aussteuerung gesetzt",
      color: "#a8a29e",
      textColor: "#57534e",
      bg: "#f5f5f4",
      ring: "#e7e5e4",
    };
  }
  const computed = daysUntil(date);
  if (computed == null) {
    return {
      daysLeft: null,
      level: "ok",
      label: "Keine Aussteuerung gesetzt",
      color: "#a8a29e",
      textColor: "#57534e",
      bg: "#f5f5f4",
      ring: "#e7e5e4",
    };
  }
  const daysLeft = computed;

  if (daysLeft <= 0) {
    return {
      daysLeft,
      level: "due",
      label: daysLeft === 0 ? "Heute aussteuern" : `Überfällig (${Math.abs(daysLeft)} Tage)`,
      color: "#dc2626", // red-600
      textColor: "#b91c1c",
      bg: "#fef2f2",
      ring: "#fecaca",
    };
  }
  if (daysLeft <= 14) {
    return {
      daysLeft,
      level: "urgent",
      label: `${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"} bis Aussteuerung`,
      color: "#ea580c", // orange-600 (kräftiger in den letzten 2 Wochen)
      textColor: "#c2410c",
      bg: "#fff7ed",
      ring: "#fed7aa",
    };
  }
  if (daysLeft <= 45) {
    return {
      daysLeft,
      level: "warn",
      label: `${daysLeft} Tage bis Aussteuerung`,
      color: "#f97316", // orange-500 — ab 45 Tagen orange, damit es auffällt
      textColor: "#c2410c",
      bg: "#fff7ed",
      ring: "#fed7aa",
    };
  }
  return {
    daysLeft,
    level: "ok",
    label: `Aussteuerung in ${daysLeft} Tagen`,
    color: "#16a34a", // green-600
    textColor: "#15803d",
    bg: "#f0fdf4",
    ring: "#bbf7d0",
  };
};

export const isDecommissionAlertWindow = (
  vehicle: Pick<Vehicle, "decommission_date">,
  windowDays = 45
): boolean => {
  const info = computeDecommission(vehicle);
  return info.daysLeft !== null && info.daysLeft <= windowDays;
};
