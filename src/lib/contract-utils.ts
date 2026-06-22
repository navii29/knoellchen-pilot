export const nextContractNr = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  // 4 Stellen aus den Millisekunden + 2 Zufallsstellen. Das reine slice(-4) der
  // Millisekunden wiederholt sich alle 10 s und kollidierte mit
  // UNIQUE(org_id, contract_nr) bei schneller/paralleler Anlage (z. B. Vertrag +
  // Anschluss-Vertrag). Mit dem Zufallssuffix + Retry beim Insert praktisch ausgeschlossen.
  const seq = Date.now().toString().slice(-4);
  const rnd = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, "0");
  return `MV-${yyyy}-${seq}${rnd}`;
};

// Lokales Datum als YYYY-MM-DD (für Datums-Vergleiche in der UI).
export const localTodayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// Überzogener Mietvertrag: noch aktiv, nicht zurückgegeben, und die geplante
// Rückgabe liegt in der Vergangenheit → das Auto ist überfällig.
export const isContractOverdue = (
  c: { status: string; return_date: string; actual_return_date?: string | null },
  todayIso: string
): boolean =>
  c.status === "aktiv" && !c.actual_return_date && c.return_date < todayIso;
