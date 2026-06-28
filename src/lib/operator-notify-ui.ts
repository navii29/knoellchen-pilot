// Reine UI-/Eingabe-Helfer für die Operator-Benachrichtigungen (Glocke + Mark-
// Read). Kein DB-Zugriff → ohne Mock testbar. Die Mandanten-Grenze (RLS) liegt
// allein in der Route/im Server-Read, nicht hier.

// Badge-Text für den Ungelesen-Zähler an der Glocke. Leer bei 0, gekappt bei >9.
export const formatNotificationBadge = (count: number): string => {
  if (!Number.isFinite(count) || count <= 0) return "";
  return count > 9 ? "9+" : String(Math.floor(count));
};

// Validiert den Mark-Read-Request-Body. Eine nicht-leere String-`id` markiert
// genau diesen Eintrag; alles andere (fehlt/leer/kein String) → null = „alle".
export const parseMarkReadBody = (raw: unknown): { id: string | null } => {
  if (raw && typeof raw === "object" && "id" in raw) {
    const id = (raw as { id?: unknown }).id;
    if (typeof id === "string" && id.trim()) return { id: id.trim() };
  }
  return { id: null };
};
