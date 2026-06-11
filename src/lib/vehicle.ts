import type { VehicleStatus } from "./types";

export const MANUFACTURERS: ReadonlyArray<string> = [
  "Audi",
  "BMW",
  "Citroën",
  "Cupra",
  "Dacia",
  "Fiat",
  "Ford",
  "Hyundai",
  "Kia",
  "Mazda",
  "Mercedes-Benz",
  "Mini",
  "Nissan",
  "Opel",
  "Peugeot",
  "Porsche",
  "Renault",
  "Seat",
  "Škoda",
  "Smart",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
];

export const FUEL_TYPES: ReadonlyArray<string> = [
  "Benzin",
  "Diesel",
  "Elektro",
  "Hybrid",
  "Plug-in-Hybrid",
  "LPG",
  "CNG",
];

export const TRANSMISSIONS: ReadonlyArray<string> = ["Automatik", "Manuell"];

export const DOORS: ReadonlyArray<string> = ["2", "3", "4", "5"];

export const BODY_TYPES: ReadonlyArray<string> = [
  "Kleinwagen",
  "Limousine",
  "Kombi",
  "SUV",
  "Cabrio",
  "Coupé",
  "Van",
  "Pickup",
];

export const CATEGORIES: ReadonlyArray<string> = [
  "Mini",
  "Economy",
  "Compact",
  "Mid-Size",
  "Full-Size",
  "Premium",
  "Luxury",
  "SUV",
  "Van",
];

export const VEHICLE_STATUSES: ReadonlyArray<VehicleStatus> = [
  "aktiv",
  "inaktiv",
  "werkstatt",
  "ausgesteuert",
];

export const VEHICLE_STATUS_META: Record<
  VehicleStatus,
  { label: string; bg: string; ring: string; color: string; text: string }
> = {
  aktiv: {
    label: "Aktiv",
    bg: "#f0fdf4",
    ring: "#bbf7d0",
    color: "#16a34a",
    text: "#15803d",
  },
  inaktiv: {
    label: "Inaktiv",
    bg: "#f5f5f4",
    ring: "#e7e5e4",
    color: "#78716c",
    text: "#57534e",
  },
  werkstatt: {
    label: "Werkstatt",
    bg: "#fefce8",
    ring: "#fde68a",
    color: "#ca8a04",
    text: "#a16207",
  },
  ausgesteuert: {
    label: "Ausgesteuert",
    bg: "#fef2f2",
    ring: "#fecaca",
    color: "#dc2626",
    text: "#b91c1c",
  },
};

export const buildVehicleType = (
  manufacturer: string | null | undefined,
  model: string | null | undefined
): string | null => {
  const parts = [manufacturer?.trim(), model?.trim()].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" ");
};

/**
 * Ausgeflottet? — true wenn der Status explizit "ausgesteuert" ist ODER das
 * Ausflottungsdatum (decommission_date) erreicht/überschritten wurde.
 * Ausgeflottete Fahrzeuge verschwinden aus aktiven Listen & der Fahrzeugsuche,
 * bleiben aber für Rückfragen über den Archiv-Tab einsehbar.
 */
export const isDecommissioned = (
  v: { status?: VehicleStatus | string | null; decommission_date?: string | null },
  today: Date = new Date()
): boolean => {
  if (v.status === "ausgesteuert") return true;
  if (!v.decommission_date) return false;
  const d = new Date(v.decommission_date);
  d.setHours(0, 0, 0, 0);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return d.getTime() <= t.getTime();
};
