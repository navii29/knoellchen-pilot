// Schadens-Vokabular für den 3D-Marker (Schritt 2c). Schadenstyp ist neu;
// Schweregrad nutzt das BESTEHENDE Modell wieder: DamageSeverity (types.ts) +
// Farben aus SEVERITY_STYLE (handover.ts) — nichts dupliziert.
import type { DamageSeverity } from "./types";
import { SEVERITY_STYLE } from "./handover";

export const DAMAGE_TYPES: { id: string; label: string }[] = [
  { id: "kratzer", label: "Kratzer" },
  { id: "delle", label: "Delle" },
  { id: "lack", label: "Lack" },
  { id: "glas", label: "Glas" },
  { id: "felge", label: "Felge" },
];

// Schweregrad-Auswahl: nur minor/major (ein Marker IST ein Schaden → "none"
// weggelassen). Deutsche Kurz-Labels; Farbe aus dem bestehenden SEVERITY_STYLE.
export const SEVERITY_OPTIONS: { value: DamageSeverity; label: string; color: string }[] = [
  { value: "minor", label: "leicht", color: SEVERITY_STYLE.minor.color },
  { value: "major", label: "schwer", color: SEVERITY_STYLE.major.color },
];

const UNGRADED_COLOR = "#9ca3af"; // grau = noch nicht eingestuft

// Marker-Farbe nach Schweregrad: grau (nicht eingestuft) / amber (leicht) / rot (schwer).
export const severityColor = (sev: DamageSeverity | null): string =>
  sev === "minor"
    ? SEVERITY_STYLE.minor.color
    : sev === "major"
      ? SEVERITY_STYLE.major.color
      : UNGRADED_COLOR;
