import { Ticket } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, fmtEur } from "@/lib/utils";
import { Surface } from "@/components/portal/kit/Surface";
import { StatusBadge } from "@/components/portal/kit/StatusBadge";
import { EmptyState } from "@/components/portal/kit/EmptyState";

export const dynamic = "force-dynamic";

type TRow = {
  id: string;
  ticket_nr: string | null;
  status: string;
  offense: string | null;
  offense_date: string | null;
  total_charge: number | null;
  fine_amount: number | null;
  paid: boolean | null;
};

export default async function PortalStrafzettelPage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const { data: tickets } = await admin
    .from("tickets")
    .select(
      "id, ticket_nr, status, offense, offense_date, total_charge, fine_amount, paid, created_at, contracts!inner(customer_id)"
    )
    .eq("org_id", ctx.session.org_id)
    .eq("contracts.customer_id", ctx.session.customer_id)
    .order("created_at", { ascending: false });

  const list = (tickets ?? []) as unknown as TRow[];

  return (
    <div className="px-5 py-4 space-y-4">
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">
        Strafzettel
      </h1>

      {list.length === 0 ? (
        <Surface>
          <EmptyState
            Icon={Ticket}
            title="Keine Strafzettel"
            text="Hier erscheinen an dich weiterbelastete Strafzettel."
          />
        </Surface>
      ) : (
        <Surface padding="p-0" className="overflow-hidden">
          <div className="divide-y divide-hairline">
            {list.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[12px] text-ink-muted">{t.ticket_nr || "—"}</span>
                  <StatusBadge status={t.paid ? "bezahlt" : t.status} />
                </div>
                <div className="text-[14px] text-ink font-medium mt-0.5">
                  {t.offense || "Verstoß"}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[12px] text-ink-muted font-mono tnum">
                    {t.offense_date ? fmtDate(t.offense_date) : ""}
                  </span>
                  <span className="text-[13px] font-mono font-semibold tnum text-ink">
                    {fmtEur(Number(t.total_charge ?? t.fine_amount ?? 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}

      <p className="text-[11px] text-ink-muted px-1">
        Online-Bezahlung &amp; Einspruch folgen in Kürze.
      </p>
    </div>
  );
}
