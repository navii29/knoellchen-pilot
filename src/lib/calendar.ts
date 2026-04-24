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
