// Validiert/normalisiert eine Marken-Farbe (organizations.brand_color). Reine
// Funktion → ohne DB testbar. Akzeptiert NUR gültiges Hex (#rgb oder #rrggbb,
// case-insensitiv) und gibt es kleingeschrieben zurück; alles andere (leer,
// kein '#', falsche Länge, Farbnamen, Injection-Versuche) → null. So landet nie
// ein roher/unsicherer Wert in der DB oder als CSS-Variable im PDF.
export const normalizeHexColor = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) return null;
  return t.toLowerCase();
};
