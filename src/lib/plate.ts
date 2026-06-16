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
  // Bevorzugt: Stadt-Grenze aus dem ersten Trenner im Original ableiten.
  // Deutsche Kennzeichen schreiben "STADT-ERKENNUNG NUMMER"; der erste Bindestrich
  // bzw. das erste Leerzeichen markiert das Ende des Stadtcodes. Wird der Trenner
  // vor dem Zusammenziehen verworfen, rät eine reine Längen-Heuristik die Grenze
  // falsch, sobald die Erkennungsbuchstaben zweistellig sind
  // (z.B. "M-QA 1234" → fälschlich "MQ-A1234", "M-KP2847" → "MK-P2847").
  const sep = p.match(/^([A-ZÄÖÜ]{1,3})[\s\-]+([A-ZÄÖÜ]{1,2})[\s\-]*(\d{1,4})([EH]?)$/);
  if (sep) {
    const [, city, letters, numbers, suffix] = sep;
    return `${city}-${letters}${numbers}${suffix}`;
  }

  const cleaned = p.replace(/[\s\-]+/g, ""); // alles raus

  // Fallback ohne brauchbaren Trenner: zusammenziehen und Grenze raten.
  // Stadt non-greedy ({1,3}?), damit der häufige Fall "ein-Buchstaben-Stadt +
  // zwei Erkennungsbuchstaben" korrekt erkannt wird (z.B. "MQA1234" → "M-QA1234").
  // Backtracking erzwingt bei Bedarf längere Stadtcodes ("HHAB1234" → "HH-AB1234").
  const match = cleaned.match(/^([A-ZÄÖÜ]{1,3}?)([A-ZÄÖÜ]{1,2})(\d{1,4})([EH]?)$/);
  if (match) {
    const [, city, letters, numbers, suffix] = match;
    return `${city}-${letters}${numbers}${suffix}`;
  }

  // Kein Standard-Format erkannt — nur uppercase und whitespace raus
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
