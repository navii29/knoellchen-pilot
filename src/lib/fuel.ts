// Einzelquelle für Tankstände. Die KEYS müssen exakt dem DB-CHECK entsprechen
// (contracts_fuel_level_pickup_chk / _return_chk): full/three_quarter/half/
// quarter/empty. Die Labels sind reine Anzeige (deutsch). Überall verwenden —
// kein verstreutes Mapping mehr.
export const FUEL_LEVELS = [
  { value: "full", label: "Voll" },
  { value: "three_quarter", label: "¾" },
  { value: "half", label: "½" },
  { value: "quarter", label: "¼" },
  { value: "empty", label: "Reserve" },
] as const;

export type FuelLevel = (typeof FUEL_LEVELS)[number]["value"];

const LABELS: Record<string, string> = Object.fromEntries(
  FUEL_LEVELS.map((f) => [f.value, f.label])
);

/** Key → deutsches Label (für Anzeige/PDF). Leer/unbekannt → "" bzw. Roh-Key. */
export const fuelLabel = (key: string | null | undefined): string =>
  key ? LABELS[key] ?? key : "";

/** Whitelist-Guard: ist der Wert ein gültiger Tankstand-Key? (leerer String/null → false) */
export const isFuelLevel = (v: unknown): v is FuelLevel =>
  typeof v === "string" && FUEL_LEVELS.some((f) => f.value === v);
