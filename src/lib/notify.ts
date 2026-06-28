import { createAdminClient } from "@/lib/supabase/server";

export type NotifyInput = {
  customer_id: string;
  org_id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

// Legt eine In-Portal-Benachrichtigung an (Admin-Client; serverseitig).
// best-effort: Insert-Fehler werden PII-frei geloggt, aber NICHT geworfen — die
// aufrufende Hauptaktion darf nie kippen, nur weil die Benachrichtigung scheitert.
export const notify = async (n: NotifyInput) => {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    customer_id: n.customer_id,
    org_id: n.org_id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
  });
  // NUR error.code + Typ + customer_id (UUID) loggen — niemals title/body/link
  // (können Datums-/Vertragswerte enthalten = PII, DSGVO).
  if (error)
    console.error(
      "[notify] notifications.insert fehlgeschlagen (customer_id=" +
        n.customer_id +
        ", type=" +
        n.type +
        "):",
      error.code ?? ""
    );
};

// Legt nur an, wenn keine UNGELESENE Benachrichtigung gleichen Typs (+ Link)
// existiert — verhindert Dauer-Spam durch den Reminder-Cron. Gibt zurück, ob
// angelegt wurde.
export const notifyOnce = async (n: NotifyInput): Promise<boolean> => {
  const admin = createAdminClient();
  let q = admin
    .from("notifications")
    .select("id")
    .eq("customer_id", n.customer_id)
    .eq("type", n.type)
    .is("read_at", null);
  if (n.link) q = q.eq("link", n.link);
  const { data, error } = await q.limit(1);
  // Dedup-Select-Fehler PII-frei loggen (gleiche Klasse). Bei Fehler ist data
  // leer → wir legen lieber an (best-effort), statt die Benachrichtigung zu
  // verschlucken.
  if (error)
    console.error(
      "[notify] notifications.dedup-select fehlgeschlagen (customer_id=" +
        n.customer_id +
        ", type=" +
        n.type +
        "):",
      error.code ?? ""
    );
  if (data && data.length > 0) return false;
  await notify(n);
  return true;
};
