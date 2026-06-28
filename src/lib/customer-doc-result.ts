// Ehrliche Erfolgs-/Fehler-Rückmeldung für den OCR→Kunde-Upload
// (customers/[id]/document). Reine Funktion, damit die Garantie „bei Update-
// Fehler werden NIE Felder als Erfolg gemeldet" testbar bleibt — ohne die
// schwer mockbare Route (Supabase/Storage/Anthropic) anzufassen.
//
// Bewusst getrennt von customer-docs.ts: die Merge-/Datums-Logik dort ist
// abgeschlossen und wird hier NICHT berührt.

export type DocOcrResult = {
  // Felder, die TATSÄCHLICH persistiert wurden (leer, wenn nichts gespeichert
  // werden konnte). Niemals die nur GEPLANTEN Felder bei einem Update-Fehler.
  filled: string[];
  // true, sobald irgendetwas am OCR/Speichern schiefging (Parse- ODER Save-Fehler).
  ocr_error: boolean;
  // true NUR, wenn ausgelesen wurde, das atomare customers.update aber scheiterte
  // (Daten erkannt, aber nicht gespeichert) — erlaubt der UI eine präzise Warnung.
  save_failed: boolean;
};

/**
 * Verdichtet das Ergebnis des OCR-Schritts zu einer ehrlichen Response.
 * - update erfolgreich  → filled = die geplanten Felder, keine Fehler.
 * - update fehlgeschlagen → filled = [] (nichts persistiert) + ocr_error + save_failed.
 * - parse fehlgeschlagen → filled = [] + ocr_error (save_failed bleibt false).
 * - nichts zu füllen     → filled = [], keine Fehler.
 */
export const summarizeDocOcr = (input: {
  plannedFilled: string[];
  parseFailed: boolean;
  updateFailed: boolean;
}): DocOcrResult => {
  const { plannedFilled, parseFailed, updateFailed } = input;
  const saved = !parseFailed && !updateFailed;
  return {
    filled: saved ? plannedFilled : [],
    ocr_error: parseFailed || updateFailed,
    save_failed: updateFailed,
  };
};
