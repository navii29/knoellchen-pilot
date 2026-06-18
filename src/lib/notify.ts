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
export const notify = async (n: NotifyInput) => {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    customer_id: n.customer_id,
    org_id: n.org_id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
  });
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
  const { data } = await q.limit(1);
  if (data && data.length > 0) return false;
  await notify(n);
  return true;
};
