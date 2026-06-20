export const nextContractNr = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const seq = Date.now().toString().slice(-4);
  return `MV-${yyyy}-${seq}`;
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
