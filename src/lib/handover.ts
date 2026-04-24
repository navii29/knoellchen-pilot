import type { DamageSeverity, HandoverPosition } from "./types";

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
