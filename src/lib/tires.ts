export type TireType = "summer" | "winter" | "allseason";
export type TireCondition = "new" | "good" | "worn" | "replace";
export type TirePhotoPosition =
  | "front_left"
  | "front_right"
  | "rear_left"
  | "rear_right"
  | "overview"
  | "tread";

export type VehicleTire = {
  id: string;
  vehicle_id: string;
  org_id: string;
  type: TireType;
  brand: string | null;
  model: string | null;
  size: string | null;
  dot_number: string | null;
  tread_depth_fl: number | null;
  tread_depth_fr: number | null;
  tread_depth_rl: number | null;
  tread_depth_rr: number | null;
  km_at_mount: number | null;
  mounted_at: string | null;
  dismounted_at: string | null;
  is_current: boolean;
  storage_location: string | null;
  condition: TireCondition;
  notes: string | null;
  created_at: string;
};

export type TirePhoto = {
  id: string;
  tire_id: string;
  position: TirePhotoPosition;
  photo_path: string;
  created_at: string;
};

export const TIRE_TYPE_META: Record<
  TireType,
  { label: string; short: string; bg: string; ring: string; color: string; text: string; emoji: string }
> = {
  summer: {
    label: "Sommerreifen",
    short: "Sommer",
    bg: "#fff7ed",
    ring: "#fed7aa",
    color: "#ea580c",
    text: "#c2410c",
    emoji: "☀",
  },
  winter: {
    label: "Winterreifen",
    short: "Winter",
    bg: "#eff6ff",
    ring: "#bfdbfe",
    color: "#2563eb",
    text: "#1d4ed8",
    emoji: "❄",
  },
  allseason: {
    label: "Ganzjahresreifen",
    short: "Ganzjahr",
    bg: "#f0fdf4",
    ring: "#bbf7d0",
    color: "#16a34a",
    text: "#15803d",
    emoji: "◐",
  },
};

export const TIRE_CONDITION_META: Record<TireCondition, { label: string; color: string }> = {
  new: { label: "Neu", color: "#16a34a" },
  good: { label: "Gut", color: "#22c55e" },
  worn: { label: "Abgenutzt", color: "#ca8a04" },
  replace: { label: "Wechseln", color: "#dc2626" },
};

export const TIRE_POSITIONS: ReadonlyArray<{
  key: keyof VehicleTire & ("tread_depth_fl" | "tread_depth_fr" | "tread_depth_rl" | "tread_depth_rr");
  label: string;
  short: string;
}> = [
  { key: "tread_depth_fl", label: "Vorne links", short: "VL" },
  { key: "tread_depth_fr", label: "Vorne rechts", short: "VR" },
  { key: "tread_depth_rl", label: "Hinten links", short: "HL" },
  { key: "tread_depth_rr", label: "Hinten rechts", short: "HR" },
];

export const TIRE_PHOTO_POSITIONS: ReadonlyArray<{
  key: TirePhotoPosition;
  label: string;
  hint: string;
}> = [
  { key: "front_left", label: "Vorne links", hint: "Reifen nah" },
  { key: "front_right", label: "Vorne rechts", hint: "Reifen nah" },
  { key: "rear_left", label: "Hinten links", hint: "Reifen nah" },
  { key: "rear_right", label: "Hinten rechts", hint: "Reifen nah" },
  { key: "overview", label: "Übersicht", hint: "Alle 4 Reifen" },
  { key: "tread", label: "Profil", hint: "Profiltiefe-Nahaufnahme" },
];

// =====================================================
// Profil-Farbcode (mm)
// =====================================================
export type TreadLevel = "ok" | "warn" | "critical" | "missing";

export const treadLevel = (mm: number | null | undefined): TreadLevel => {
  if (mm == null || !Number.isFinite(Number(mm))) return "missing";
  const v = Number(mm);
  if (v < 3) return "critical";
  if (v < 4) return "warn";
  return "ok";
};

export const TREAD_LEVEL_META: Record<
  TreadLevel,
  { bg: string; ring: string; color: string; text: string; label: string }
> = {
  ok: {
    bg: "#f0fdf4",
    ring: "#bbf7d0",
    color: "#16a34a",
    text: "#15803d",
    label: "OK",
  },
  warn: {
    bg: "#fefce8",
    ring: "#fde68a",
    color: "#ca8a04",
    text: "#a16207",
    label: "Achtung",
  },
  critical: {
    bg: "#fef2f2",
    ring: "#fecaca",
    color: "#dc2626",
    text: "#b91c1c",
    label: "Wechsel",
  },
  missing: {
    bg: "#f5f5f4",
    ring: "#e7e5e4",
    color: "#a8a29e",
    text: "#57534e",
    label: "—",
  },
};

export const minTread = (t: VehicleTire): number | null => {
  const values = [t.tread_depth_fl, t.tread_depth_fr, t.tread_depth_rl, t.tread_depth_rr]
    .map((v) => (v == null ? null : Number(v)))
    .filter((v): v is number => v != null && Number.isFinite(v));
  return values.length > 0 ? Math.min(...values) : null;
};

export const worstTreadLevel = (t: VehicleTire): TreadLevel => {
  const m = minTread(t);
  return treadLevel(m);
};

// =====================================================
// Saisonalität: Mai (5) → Sommer/Allseason ok
//                Nov (11) – März (3) → Winter/Allseason ok
// =====================================================
export const isWinterMonth = (month: number) => month >= 11 || month <= 3;
export const isSummerMonth = (month: number) => month >= 4 && month <= 10;

export type SeasonMismatch = "summer_in_winter" | "winter_in_summer" | null;

export const seasonMismatch = (
  type: TireType,
  date: Date = new Date()
): SeasonMismatch => {
  if (type === "allseason") return null;
  const m = date.getMonth() + 1; // 1–12
  if (type === "summer" && isWinterMonth(m)) return "summer_in_winter";
  if (type === "winter" && isSummerMonth(m)) return "winter_in_summer";
  return null;
};
