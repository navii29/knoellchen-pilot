import { minTread, seasonMismatch, type TireType, type VehicleTire } from "./tires";

export type TireAlertItem = {
  vehicle_id: string;
  plate: string;
  vehicle_label: string;
  tire_type: TireType;
  min_tread_mm: number | null;
  reason: "low_tread" | "season_mismatch" | "both";
};

// Server-safe — KEINE "use client"-Direktive, damit aus Server-Components
// aufrufbar (Dashboard-Page lädt die Daten und ruft diese Funktion).
export const buildTireAlerts = (
  tires: (VehicleTire & {
    vehicles?: {
      id: string;
      plate: string;
      manufacturer: string | null;
      model: string | null;
      vehicle_type: string | null;
    } | null;
  })[]
): TireAlertItem[] => {
  const items: TireAlertItem[] = [];
  for (const t of tires) {
    if (!t.is_current || !t.vehicles) continue;
    const minMm = minTread(t);
    const lowTread = minMm != null && minMm < 3;
    const mismatch = seasonMismatch(t.type);
    if (!lowTread && !mismatch) continue;
    items.push({
      vehicle_id: t.vehicle_id,
      plate: t.vehicles.plate,
      vehicle_label:
        [t.vehicles.manufacturer, t.vehicles.model].filter(Boolean).join(" ") ||
        t.vehicles.vehicle_type ||
        "Fahrzeug",
      tire_type: t.type,
      min_tread_mm: minMm,
      reason:
        lowTread && mismatch ? "both" : lowTread ? "low_tread" : "season_mismatch",
    });
  }
  return items;
};
