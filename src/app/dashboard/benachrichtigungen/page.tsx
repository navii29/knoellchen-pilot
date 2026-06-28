import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import {
  OperatorNotificationList,
  type OperatorNotification,
} from "@/components/dashboard/OperatorNotificationList";

export const dynamic = "force-dynamic";

// Operator-Benachrichtigungen. Lesen über den RLS-Operator-Client (createClient)
// — die Policy "Operator notifications by org" (org_id = current_org_id(),
// Migration 067) ist die Mandanten-Grenze; KEIN manueller org_id-Filter, KEIN
// admin-Client. Reine Anzeige.
export default async function OperatorNotificationsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("operator_notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as OperatorNotification[];

  return (
    <>
      <Topbar section="Benachrichtigungen" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="max-w-3xl mx-auto p-4 md:p-10">
          <h1 className="font-display font-extrabold text-ink text-[26px] sm:text-[30px] leading-[1.05] tracking-tightest mb-1">
            Benachrichtigungen
          </h1>
          <p className="text-[13px] text-ink-muted mb-6">
            Ereignisse aus dem Mieter-Portal — z.&nbsp;B. neue Verlängerungs-Anfragen. Als gelesen
            markieren betrifft nur die Benachrichtigung; die Anfrage bearbeitest du weiterhin im
            Vertrag.
          </p>
          <OperatorNotificationList items={items} />
        </div>
      </div>
    </>
  );
}
