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

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
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
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(date));
  const ms = target.getTime() - today.getTime();
  const daysLeft = Math.round(ms / 86_400_000);

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
  if (daysLeft <= 7) {
    return {
      daysLeft,
      level: "urgent",
      label: `${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"} bis Aussteuerung`,
      color: "#ea580c", // orange-600
      textColor: "#c2410c",
      bg: "#fff7ed",
      ring: "#fed7aa",
    };
  }
  if (daysLeft <= 21) {
    return {
      daysLeft,
      level: "warn",
      label: `${daysLeft} Tage bis Aussteuerung`,
      color: "#ca8a04", // yellow-600
      textColor: "#a16207",
      bg: "#fefce8",
      ring: "#fde68a",
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
  windowDays = 21
): boolean => {
  const info = computeDecommission(vehicle);
  return info.daysLeft !== null && info.daysLeft <= windowDays;
};
