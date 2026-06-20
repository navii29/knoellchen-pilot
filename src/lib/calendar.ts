import type { Contract } from "./types";

const DAY_MS = 86_400_000;

export const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Montag der gegebenen Woche (ISO: Mo=1, So=7)
export const mondayOfWeek = (d: Date): Date => {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=So, 1=Mo, ..., 6=Sa
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  return x;
};

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const toIso = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const parseIso = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Liefert die 7 Tage einer Woche ab Montag
export const weekDays = (monday: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export const daysBetween = (from: Date, to: Date): number =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

export type LaidContract = {
  contract: Contract;
  // 1-basierter Spaltenindex innerhalb der Woche (1=Mo, 7=So)
  startCol: number;
  endCol: number; // inklusive
  span: number;
  clippedLeft: boolean;
  clippedRight: boolean;
  isOverdue: boolean;
  track: number; // vertikaler Slot innerhalb der Vehicle-Zeile
};

export const layoutWeek = (
  contracts: Contract[],
  weekStart: Date,
  todayIso: string
): { laid: LaidContract[]; trackCount: number } => {
  const weekStartIso = toIso(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const weekEndIso = toIso(weekEnd);

  // 1. Filter: nur Verträge die mit der Woche überlappen
  const visible = contracts.filter((c) => {
    const end = c.actual_return_date ?? c.return_date;
    return c.pickup_date <= weekEndIso && end >= weekStartIso;
  });

  // 2. Sortiere nach pickup_date (frühe zuerst)
  visible.sort((a, b) => (a.pickup_date < b.pickup_date ? -1 : 1));

  // 3. Track-Zuteilung (greedy, kein Überlappen pro Track)
  type TrackEnd = string; // ISO-Datum letzter Tag belegt
  const trackEnds: TrackEnd[] = [];

  const laid: LaidContract[] = visible.map((c) => {
    const startIso = c.pickup_date < weekStartIso ? weekStartIso : c.pickup_date;
    const endRaw = c.actual_return_date ?? c.return_date;
    const endIso = endRaw > weekEndIso ? weekEndIso : endRaw;

    const startDate = parseIso(startIso);
    const endDate = parseIso(endIso);
    const startCol = daysBetween(weekStart, startDate) + 1;
    const endCol = daysBetween(weekStart, endDate) + 1;

    // freien Track finden
    let track = trackEnds.findIndex((t) => t < c.pickup_date);
    if (track === -1) {
      track = trackEnds.length;
      trackEnds.push("");
    }
    trackEnds[track] = endRaw;

    const isOverdue =
      c.status === "aktiv" &&
      !c.actual_return_date &&
      c.return_date < todayIso;

    return {
      contract: c,
      startCol,
      endCol,
      span: endCol - startCol + 1,
      clippedLeft: c.pickup_date < weekStartIso,
      clippedRight: endRaw > weekEndIso,
      isOverdue,
      track,
    };
  });

  return { laid, trackCount: Math.max(1, trackEnds.length) };
};

// =====================================================
// Mehrere Ansichten: Woche / 2 Wochen / Monat
// =====================================================
export type CalView = "week" | "2week" | "month";

export const daysInMonth = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

// Zeitraum-Anker + Tagesanzahl für eine Ansicht.
// Woche/2 Wochen starten am Montag; Monat am Monatsersten.
export const viewRange = (
  view: CalView,
  anchor: Date
): { rangeStart: Date; dayCount: number } => {
  if (view === "month") {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    return { rangeStart: startOfDay(first), dayCount: daysInMonth(anchor) };
  }
  return { rangeStart: mondayOfWeek(anchor), dayCount: view === "2week" ? 14 : 7 };
};

// Schritt für Vor/Zurück-Navigation (in Tagen bzw. Monaten).
export const stepAnchor = (view: CalView, anchor: Date, dir: -1 | 1): Date => {
  if (view === "month") {
    return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
  }
  return addDays(anchor, dir * (view === "2week" ? 14 : 7));
};

export const rangeDays = (rangeStart: Date, dayCount: number): Date[] =>
  Array.from({ length: dayCount }, (_, i) => addDays(rangeStart, i));

// Generalisiertes Layout für einen beliebigen Zeitraum (statt fester Woche).
// startCol/endCol sind 1-basiert relativ zu rangeStart (1..dayCount).
export const layoutRange = (
  contracts: Contract[],
  rangeStart: Date,
  dayCount: number,
  todayIso: string
): { laid: LaidContract[]; trackCount: number } => {
  const rangeStartIso = toIso(rangeStart);
  const rangeEnd = addDays(rangeStart, dayCount - 1);
  const rangeEndIso = toIso(rangeEnd);

  const visible = contracts.filter((c) => {
    const end = c.actual_return_date ?? c.return_date;
    return c.pickup_date <= rangeEndIso && end >= rangeStartIso;
  });
  visible.sort((a, b) => (a.pickup_date < b.pickup_date ? -1 : 1));

  const trackEnds: string[] = [];
  const laid: LaidContract[] = visible.map((c) => {
    const startIso = c.pickup_date < rangeStartIso ? rangeStartIso : c.pickup_date;
    const endRaw = c.actual_return_date ?? c.return_date;
    const endIso = endRaw > rangeEndIso ? rangeEndIso : endRaw;
    const startCol = daysBetween(rangeStart, parseIso(startIso)) + 1;
    const endCol = daysBetween(rangeStart, parseIso(endIso)) + 1;

    let track = trackEnds.findIndex((t) => t < c.pickup_date);
    if (track === -1) {
      track = trackEnds.length;
      trackEnds.push("");
    }
    trackEnds[track] = endRaw;

    const isOverdue =
      c.status === "aktiv" && !c.actual_return_date && c.return_date < todayIso;

    return {
      contract: c,
      startCol,
      endCol,
      span: endCol - startCol + 1,
      clippedLeft: c.pickup_date < rangeStartIso,
      clippedRight: endRaw > rangeEndIso,
      isOverdue,
      track,
    };
  });

  return { laid, trackCount: Math.max(1, trackEnds.length) };
};

// =====================================================
// Status eines Vertrags für die Kalender-Färbung
// =====================================================
export type CalStatus = "geplant" | "aktiv" | "abgeschlossen" | "ueberfaellig";

export const calStatus = (c: Contract, todayIso: string): CalStatus => {
  const end = c.actual_return_date ?? c.return_date;
  if (c.status === "abgeschlossen" || c.actual_return_date) return "abgeschlossen";
  if (c.pickup_date > todayIso) return "geplant";
  // läuft (pickup <= heute): überfällig, wenn das Ende in der Vergangenheit liegt
  if (end < todayIso) return "ueberfaellig";
  return "aktiv";
};

export const CAL_STATUS_META: Record<
  CalStatus,
  { label: string; bg: string; bgHover: string }
> = {
  geplant: { label: "Geplant", bg: "#2563eb", bgHover: "#1d4ed8" },
  aktiv: { label: "Aktiv", bg: "#0d9488", bgHover: "#0f766e" },
  abgeschlossen: { label: "Abgeschlossen", bg: "#94a3b8", bgHover: "#64748b" },
  ueberfaellig: { label: "Überfällig", bg: "#dc2626", bgHover: "#b91c1c" },
};

// Vertrags-ids, die sich auf demselben Fahrzeug datumsmäßig überschneiden
// (= echte Doppelbelegung). Erwartet die Verträge EINES Fahrzeugs.
export const overbookedContractIds = (contracts: Contract[]): Set<string> => {
  const out = new Set<string>();
  const sorted = [...contracts].sort((a, b) => (a.pickup_date < b.pickup_date ? -1 : 1));
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    const aEnd = a.actual_return_date ?? a.return_date;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.pickup_date > aEnd) break; // sortiert → keine weitere Überschneidung
      out.add(a.id);
      out.add(b.id);
    }
  }
  return out;
};

// Stabile satte Farbe pro Vertrag (deterministisch via Hash) — weißer Text
export const colorForContract = (id: string): { bg: string; bgHover: string; ring: string } => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const palette = [
    { bg: "#0d9488", bgHover: "#0f766e", ring: "#0f766e" }, // teal-600
    { bg: "#2563eb", bgHover: "#1d4ed8", ring: "#1d4ed8" }, // blue-600
    { bg: "#7c3aed", bgHover: "#6d28d9", ring: "#6d28d9" }, // violet-600
    { bg: "#db2777", bgHover: "#be185d", ring: "#be185d" }, // pink-600
    { bg: "#d97706", bgHover: "#b45309", ring: "#b45309" }, // amber-600
    { bg: "#16a34a", bgHover: "#15803d", ring: "#15803d" }, // green-600
    { bg: "#ea580c", bgHover: "#c2410c", ring: "#c2410c" }, // orange-600
    { bg: "#4f46e5", bgHover: "#4338ca", ring: "#4338ca" }, // indigo-600
  ];
  return palette[h % palette.length];
};
