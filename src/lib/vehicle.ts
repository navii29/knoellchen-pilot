import { normalizePlate } from "./plate";
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

// Geschäftslinie (früher Fahrzeuggröße): worüber das Fahrzeug vermietet wird.
// Wird auch beim Shopify-Sync automatisch gesetzt (deriveBusinessLine).
export const CATEGORIES: ReadonlyArray<string> = [
  "Tagesmiete",
  "Sportwagen",
  "Auto-Abo",
  "Langzeitmiete",
  "Fuhrpark",
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

// Folgefahrzeug-/Nachfolge-Status (Migration 051)
export const SUCCESSOR_STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  offen: { label: "Nachfolge offen", color: "#a16207", bg: "#fefce8" },
  zugeteilt: { label: "Folgefahrzeug zugeteilt", color: "#15803d", bg: "#f0fdf4" },
  ersatzlos: { label: "läuft ersatzlos aus", color: "#57534e", bg: "#f5f5f4" },
};

export const buildVehicleType = (
  manufacturer: string | null | undefined,
  model: string | null | undefined
): string | null => {
  const parts = [manufacturer?.trim(), model?.trim()].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" ");
};

type VehicleSearchFields = {
  plate?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  vehicle_type?: string | null;
  color?: string | null;
  body_type?: string | null;
  category?: string | null;
  fin_number?: string | null;
};

/**
 * Prüft, ob ein Fahrzeug zur freien Sucheingabe passt.
 *
 * Kennzeichen werden kanonisch OHNE Leerzeichen gespeichert ("M-S 8271" →
 * "M-S8271"). Deshalb wird die Eingabe zusätzlich via normalizePlate
 * normalisiert — sonst findet eine natürliche Eingabe mit Leerzeichen das
 * gespeicherte Plate nie (genau dieser Bug: Kennzeichen-Suche lieferte 0
 * Treffer). Reiner Text (z. B. "peugeot") ergibt über normalizePlate keinen
 * Plate-Treffer und wird über die Textsuche (Hersteller/Modell/Typ/Farbe/
 * Karosserie/Kategorie/FIN) abgedeckt.
 */
export const vehicleMatchesSearch = (
  v: VehicleSearchFields,
  query: string
): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const plateNeedle = normalizePlate(query).toLowerCase();
  if (
    plateNeedle &&
    normalizePlate(v.plate).toLowerCase().includes(plateNeedle)
  ) {
    return true;
  }
  const name = buildVehicleType(v.manufacturer, v.model) || v.vehicle_type || "";
  return [v.plate, name, v.color, v.body_type, v.category, v.fin_number]
    .filter(Boolean)
    .some((s) => String(s).toLowerCase().includes(needle));
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
  // String-basierter Vergleich (TZ-sicher): `new Date(dateonly)` + lokales
  // setHours kann in negativen UTC-Zonen einen Tag verschieben. Heutiges
  // ISO-Datum aus den LOKALEN Komponenten ableiten und als YYYY-MM-DD
  // (lexikografisch == chronologisch) vergleichen.
  const t = new Date(today);
  const todayIso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  return v.decommission_date <= todayIso;
};

type VehicleBackfillInput = {
  manufacturer?: string | null;
  model?: string | null;
  vehicle_type?: string | null;
  daily_rate?: number | null;
  deposit?: number | null;
  km_at_intake?: number | null;
  color?: string | null;
  fin_number?: string | null;
  weekly_rate?: number | null;
  monthly_rate?: number | null;
};

// Verträge tragen NUR diese Fahrzeug-/Preisfelder (kein separates
// manufacturer/model — die Spalten existieren auf contracts nicht). Hersteller/
// Modell werden daher unten aus dem vehicle_type abgeleitet. km_pickup/km_return
// liefern die Übergabe-km für km_at_intake (KM bei Einsteuerung).
type ContractBackfillInput = {
  pickup_date?: string | null;
  vehicle_type?: string | null;
  daily_rate?: number | null;
  deposit?: number | null;
  km_pickup?: number | null;
  km_return?: number | null;
  vehicle_color?: string | null;
  vehicle_fin?: string | null;
  weekly_rate?: number | null;
  monthly_rate?: number | null;
};

// Gängige Hersteller-Aliase (Kürzel/Umgangsformen) → kanonischer Name. Wird in
// splitVehicleType ZUERST geprüft, damit "VW Golf VIII" korrekt zu
// {Volkswagen, Golf VIII} wird (die MANUFACTURERS-Liste kennt nur "Volkswagen").
const MANUFACTURER_ALIASES: Record<string, string> = {
  vw: "Volkswagen",
  mercedes: "Mercedes-Benz",
  merc: "Mercedes-Benz",
  mb: "Mercedes-Benz",
};

/**
 * Zerlegt einen vehicle_type ("Peugeot 2008") in Hersteller + Modell.
 *
 * Reihenfolge: zuerst das erste Token gegen die Alias-Map prüfen ("VW",
 * "Mercedes" …) → kanonischer Hersteller + Rest als Modell. Sonst längster
 * Präfix aus der bekannten Hersteller-Liste (z. B. "Mercedes-Benz" vor einem
 * kürzeren Treffer). Kein Treffer → null.
 */
const splitVehicleType = (
  vehicleType: string
): { manufacturer: string; model: string | null } | null => {
  const trimmed = vehicleType.trim();
  // 1) Alias auf dem ersten Token
  const firstToken = trimmed.split(/\s+/)[0] ?? "";
  const alias = MANUFACTURER_ALIASES[firstToken.toLowerCase()];
  if (alias) {
    const rest = trimmed.slice(firstToken.length).trim();
    return { manufacturer: alias, model: rest || null };
  }
  // 2) Längster Präfix aus der kanonischen Hersteller-Liste
  const lower = trimmed.toLowerCase();
  const make = MANUFACTURERS.filter((m) => lower.startsWith(m.toLowerCase())).sort(
    (a, b) => b.length - a.length
  )[0];
  if (!make) return null;
  const rest = trimmed.slice(make.length).trim();
  return { manufacturer: make, model: rest || null };
};

/**
 * Befüllt LEERE Fahrzeug-Stammdaten/Preise aus den Verträgen des Fahrzeugs.
 *
 * Quelle Verträge: vehicle_type, daily_rate (Tagesmiete), deposit (Kaution).
 * Hersteller + Modell werden zusätzlich aus dem (vorhandenen oder neu
 * befüllten) vehicle_type abgeleitet, da Verträge sie nicht separat führen.
 *
 * Regel: fill-if-empty (bestehende Werte werden NIE überschrieben) und
 * "newest wins" — pro Feld gewinnt der erste Vertrag mit nicht-leerem Wert.
 * Der Aufrufer MUSS die Verträge nach pickup_date absteigend (neueste zuerst)
 * übergeben, damit "newest wins" greift. Zahlenfelder nur > 0.
 */
export function buildVehicleBackfillFromContracts(
  vehicle: VehicleBackfillInput,
  contracts: ContractBackfillInput[]
): Partial<VehicleBackfillInput> {
  const patch: Partial<VehicleBackfillInput> = {};

  if (!vehicle.vehicle_type) {
    for (const c of contracts) {
      if (c.vehicle_type && c.vehicle_type.trim() !== "") {
        patch.vehicle_type = c.vehicle_type;
        break;
      }
    }
  }

  if (!vehicle.daily_rate || vehicle.daily_rate <= 0) {
    for (const c of contracts) {
      if (c.daily_rate != null && c.daily_rate > 0) {
        patch.daily_rate = c.daily_rate;
        break;
      }
    }
  }

  if (!vehicle.deposit || vehicle.deposit <= 0) {
    for (const c of contracts) {
      if (c.deposit != null && c.deposit > 0) {
        patch.deposit = c.deposit;
        break;
      }
    }
  }

  // Farbe / FIN aus dem JÜNGSTEN Vertrag mit Wert (fill-if-empty, first wins —
  // Verträge kommen neueste-zuerst).
  if (!vehicle.color) {
    for (const c of contracts) {
      if (c.vehicle_color && c.vehicle_color.trim() !== "") {
        patch.color = c.vehicle_color;
        break;
      }
    }
  }
  if (!vehicle.fin_number) {
    for (const c of contracts) {
      if (c.vehicle_fin && c.vehicle_fin.trim() !== "") {
        patch.fin_number = c.vehicle_fin;
        break;
      }
    }
  }
  if (!vehicle.weekly_rate || vehicle.weekly_rate <= 0) {
    for (const c of contracts) {
      if (c.weekly_rate != null && c.weekly_rate > 0) {
        patch.weekly_rate = c.weekly_rate;
        break;
      }
    }
  }
  if (!vehicle.monthly_rate || vehicle.monthly_rate <= 0) {
    for (const c of contracts) {
      if (c.monthly_rate != null && c.monthly_rate > 0) {
        patch.monthly_rate = c.monthly_rate;
        break;
      }
    }
  }

  // KM bei Einsteuerung (km_at_intake) = Übergabe-km der ÄLTESTEN Vermietung.
  // Bevorzugt km_pickup (Übergabe an den Mieter), sonst km_return. Verträge
  // kommen neueste-zuerst → für die älteste von hinten iterieren.
  if (!vehicle.km_at_intake || vehicle.km_at_intake <= 0) {
    for (const c of [...contracts].reverse()) {
      const km =
        c.km_pickup != null && c.km_pickup > 0
          ? c.km_pickup
          : c.km_return != null && c.km_return > 0
          ? c.km_return
          : null;
      if (km != null) {
        patch.km_at_intake = km;
        break;
      }
    }
  }

  // Hersteller/Modell aus dem effektiven vehicle_type ableiten (fill-if-empty).
  const effectiveType = vehicle.vehicle_type || patch.vehicle_type || null;
  if (effectiveType && (!vehicle.manufacturer || !vehicle.model)) {
    const split = splitVehicleType(effectiveType);
    if (split) {
      if (!vehicle.manufacturer) patch.manufacturer = split.manufacturer;
      if (!vehicle.model && split.model) patch.model = split.model;
    }
  }

  return patch;
}
