export type VehicleEventType =
  | "service"
  | "tires"
  | "tuev"
  | "repair"
  | "insurance"
  | "other";

export type VehicleEvent = {
  id: string;
  vehicle_id: string;
  org_id: string;
  type: VehicleEventType;
  date: string;
  km_at_event: number | null;
  description: string | null;
  cost: number | null;
  next_due_date: string | null;
  next_due_km: number | null;
  provider: string | null;
  document_path: string | null;
  created_at: string;
};

export const EVENT_TYPE_META: Record<
  VehicleEventType,
  { label: string; short: string; bg: string; ring: string; color: string; text: string }
> = {
  service: {
    label: "Service / Wartung",
    short: "Service",
    bg: "#eff6ff",
    ring: "#bfdbfe",
    color: "#2563eb",
    text: "#1d4ed8",
  },
  tires: {
    label: "Reifenwechsel",
    short: "Reifen",
    bg: "#fdf4ff",
    ring: "#f5d0fe",
    color: "#a21caf",
    text: "#86198f",
  },
  tuev: {
    label: "TÜV / HU",
    short: "TÜV",
    bg: "#ecfeff",
    ring: "#a5f3fc",
    color: "#0891b2",
    text: "#0e7490",
  },
  repair: {
    label: "Reparatur",
    short: "Reparatur",
    bg: "#fff7ed",
    ring: "#fed7aa",
    color: "#ea580c",
    text: "#c2410c",
  },
  insurance: {
    label: "Versicherung",
    short: "Versicherung",
    bg: "#f0fdf4",
    ring: "#bbf7d0",
    color: "#16a34a",
    text: "#15803d",
  },
  other: {
    label: "Sonstiges",
    short: "Sonstiges",
    bg: "#f5f5f4",
    ring: "#e7e5e4",
    color: "#78716c",
    text: "#57534e",
  },
};

export type DueLevel = "ok" | "warn" | "urgent" | "due";
export type DueInfo = {
  daysLeft: number | null;
  level: DueLevel;
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

export const computeDue = (date: string | null | undefined, prefix = ""): DueInfo => {
  if (!date) {
    return {
      daysLeft: null,
      level: "ok",
      label: "Kein Termin gesetzt",
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

  if (daysLeft < 0) {
    return {
      daysLeft,
      level: "due",
      label: `Überfällig seit ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "Tag" : "Tagen"}`,
      color: "#dc2626",
      textColor: "#b91c1c",
      bg: "#fef2f2",
      ring: "#fecaca",
    };
  }
  if (daysLeft === 0) {
    return {
      daysLeft,
      level: "due",
      label: `${prefix}Heute fällig`.trim(),
      color: "#dc2626",
      textColor: "#b91c1c",
      bg: "#fef2f2",
      ring: "#fecaca",
    };
  }
  if (daysLeft <= 7) {
    return {
      daysLeft,
      level: "urgent",
      label: `${prefix}in ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tagen"}`.trim(),
      color: "#ea580c",
      textColor: "#c2410c",
      bg: "#fff7ed",
      ring: "#fed7aa",
    };
  }
  if (daysLeft <= 30) {
    return {
      daysLeft,
      level: "warn",
      label: `${prefix}in ${daysLeft} Tagen`.trim(),
      color: "#ca8a04",
      textColor: "#a16207",
      bg: "#fefce8",
      ring: "#fde68a",
    };
  }
  return {
    daysLeft,
    level: "ok",
    label: `${prefix}in ${daysLeft} Tagen`.trim(),
    color: "#16a34a",
    textColor: "#15803d",
    bg: "#f0fdf4",
    ring: "#bbf7d0",
  };
};
