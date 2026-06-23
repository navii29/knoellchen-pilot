import type { DamageSeverity, HandoverPosition } from "./types";

/** Ein einzelnes Positions-Ergebnis aus dem KI-Schadenvergleich. */
export type CompareEntry =
  | { ok: true; data: { has_damage: boolean; description: string; severity: string } }
  | { ok: false; error: string };

/** Positions-Map (position -> Ergebnis) wie sie die Compare-Route liefert/speichert. */
export type CompareResultMap = Record<string, CompareEntry>;

const SEVERITY_RANK: Record<string, number> = { none: 0, minor: 1, major: 2 };

/**
 * Aggregiert die Positions-Map zu einer Zusammenfassung für den Vertrag.
 * - has_new_damage: true, wenn mind. eine OK-Position has_damage hat.
 * - max_severity: höchste Stufe (major > minor > none) über alle OK-Positionen
 *   mit has_damage; null, wenn es keine OK-Ergebnisse gibt.
 */
export const summarizeComparison = (
  results: CompareResultMap
): { has_new_damage: boolean; max_severity: DamageSeverity | null } => {
  let hasNewDamage = false;
  let anyOk = false;
  let maxRank = -1;
  let maxSeverity: DamageSeverity | null = null;

  for (const entry of Object.values(results)) {
    if (!entry.ok) continue;
    anyOk = true;
    if (entry.data.has_damage) {
      hasNewDamage = true;
      const rank = SEVERITY_RANK[entry.data.severity] ?? -1;
      if (rank > maxRank) {
        maxRank = rank;
        maxSeverity = entry.data.severity as DamageSeverity;
      }
    }
  }

  return {
    has_new_damage: hasNewDamage,
    // Ohne OK-Ergebnisse: null. Mit OK-Ergebnissen aber ohne Schaden: 'none'.
    max_severity: anyOk ? maxSeverity ?? "none" : null,
  };
};

export const POSITIONS: ReadonlyArray<{
  key: HandoverPosition;
  label: string;
  hint: string;
}> = [
  { key: "front", label: "Vorne", hint: "Front frontal" },
  { key: "rear", label: "Hinten", hint: "Heck frontal" },
  { key: "left", label: "Links", hint: "Linke Seite komplett" },
  { key: "right", label: "Rechts", hint: "Rechte Seite komplett" },
  { key: "front_left", label: "Vorne links", hint: "Eckdetail vorne links" },
  { key: "front_right", label: "Vorne rechts", hint: "Eckdetail vorne rechts" },
  { key: "rear_left", label: "Hinten links", hint: "Eckdetail hinten links" },
  { key: "rear_right", label: "Hinten rechts", hint: "Eckdetail hinten rechts" },
  { key: "interior", label: "Innenraum", hint: "Sitze, Polster" },
  { key: "dashboard", label: "Cockpit", hint: "Tacho, Lenkrad, km-Stand" },
];

export const SEVERITY_STYLE: Record<
  DamageSeverity,
  { label: string; bg: string; ring: string; color: string; text: string }
> = {
  none: {
    label: "Kein neuer Schaden",
    bg: "#f0fdf4",
    ring: "#bbf7d0",
    color: "#16a34a",
    text: "#15803d",
  },
  minor: {
    label: "Leichter Schaden",
    bg: "#fefce8",
    ring: "#fde68a",
    color: "#ca8a04",
    text: "#a16207",
  },
  major: {
    label: "Schwerer Schaden",
    bg: "#fef2f2",
    ring: "#fecaca",
    color: "#dc2626",
    text: "#b91c1c",
  },
};
