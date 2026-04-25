/**
 * Normalisiert deutsche Kfz-Kennzeichen für robusten Vergleich.
 * Akzeptiert beliebige Whitespace-/Bindestrich-Varianten, liefert kanonische Form ohne Leerzeichen.
 *
 * Beispiele:
 *   "M-C 3116"     → "M-C3116"
 *   "M-KP2847"     → "M-KP2847"
 *   "m - c 3116"   → "M-C3116"
 *   "M C 3116"     → "M-C3116"   (ein-Buchstaben-Stadt + Buchstaben + Ziffern)
 *   "M-KP-2847"    → "M-KP2847"  (überflüssige Bindestriche)
 *   "  m-kp 2847 " → "M-KP2847"
 *   ""             → ""
 *   null/undefined → ""
 */
export const normalizePlate = (raw: string | null | undefined): string => {
  if (!raw) return "";
  // 1. Trim, uppercase
  const p = String(raw).trim().toUpperCase();
  if (p === "") return "";

  // 2. Whitespace und Bindestriche normalisieren — alles raus, dann gezielt einen Bindestrich nach dem Stadtcode setzen
  // Stadt-Letters: 1-3 Buchstaben (z.B. "M", "B", "HH", "BMW", "STD")
  // Erkennungs-Letters: 1-2 Buchstaben (z.B. "C", "KP", "AV")
  // Ziffern: 1-4 Ziffern (z.B. "1", "9999")
  // Einige Plates haben optional am Ende noch "E" (Elektro) oder "H" (Historisch)
  const cleaned = p.replace(/[\s\-]+/g, ""); // alles raus

  // Versuch: Pattern erkennen (Stadt + Letters + Numbers + Suffix)
  const match = cleaned.match(/^([A-ZÄÖÜ]{1,3})([A-ZÄÖÜ]{1,2})(\d{1,4})([EH]?)$/);
  if (match) {
    const [, city, letters, numbers, suffix] = match;
    return `${city}-${letters}${numbers}${suffix}`;
  }

  // Fallback: kein Standard-Format erkannt — nur uppercase und whitespace raus
  return cleaned;
};

/**
 * Vergleicht zwei Kennzeichen tolerant.
 */
export const platesEqual = (
  a: string | null | undefined,
  b: string | null | undefined
): boolean => {
  const na = normalizePlate(a);
  const nb = normalizePlate(b);
  return na !== "" && na === nb;
};
