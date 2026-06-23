import type { SupabaseClient } from "@supabase/supabase-js";

/** Tag (UTC) als YYYY-MM-DD — Bucket-Schlüssel für die aktive Zeit. */
export const utcDay = (d: Date = new Date()): string => d.toISOString().slice(0, 10);

// Heartbeat-Akkumulation
export const HEARTBEAT_IDLE_GAP_S = 300; // > 5 min ohne Ping = idle (zählt nicht)
export const HEARTBEAT_MAX_ADD_S = 90; // pro Ping höchstens 90 s gutschreiben
export const ONLINE_WINDOW_S = 180; // last_active < 3 min ⇒ "online"

/** Bekannte Aktions-Schlüssel → deutsche Labels fürs Überwachungs-Dashboard. */
export const ACTION_LABELS: Record<string, string> = {
  "contract.create": "Vertrag angelegt",
  "contract.activate": "Vertrag aktiviert (Rechnung)",
  "contract.return": "Rückgabe erfasst",
  "contract.email_sent": "Vertrag per E-Mail gesendet",
  "vehicle.create": "Fahrzeug angelegt",
  "customer.create": "Kunde angelegt",
  "damage.create": "Schaden gemeldet",
  "ticket.parse": "Strafzettel ausgelesen",
};

export const actionLabel = (action: string): string =>
  ACTION_LABELS[action] ?? action;

/**
 * Eine Schlüssel-Aktion eines Nutzers protokollieren. Best-effort: ein Fehler
 * beim Tracking darf die eigentliche Aktion niemals stören.
 */
export const logActivity = async (
  admin: SupabaseClient,
  userId: string,
  orgId: string,
  action: string,
  detail?: string | null
): Promise<void> => {
  try {
    await admin.from("user_activity_log").insert({
      user_id: userId,
      org_id: orgId,
      action,
      detail: detail ?? null,
    });
  } catch {
    /* still */
  }
};
