import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, fmtEur } from "@/lib/utils";
import { Plate } from "@/components/ui/Plate";

export const dynamic = "force-dynamic";

export default async function PortalContractsPage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const { data: contracts } = await admin
    .from("contracts")
    .select(
      "id, contract_nr, plate, vehicle_type, pickup_date, return_date, status, signed_at, total_amount"
    )
    .eq("org_id", ctx.session.org_id)
    .eq("customer_id", ctx.session.customer_id)
    .order("pickup_date", { ascending: false });

  const list = contracts ?? [];

  return (
    <div className="px-5 py-3">
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink mb-3">
        Verträge
      </h1>

      {list.length === 0 ? (
        <div className="bg-paper border border-hairline rounded-card shadow-panel px-5 py-8 text-center text-[13px] text-ink-muted">
          Noch keine Verträge vorhanden.
        </div>
      ) : (
        <div className="bg-paper border border-hairline rounded-card shadow-panel divide-y divide-hairline overflow-hidden">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/portal/contracts/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-canvas transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Plate value={c.plate} size="sm" />
                  <span className="text-[12px] text-ink-muted font-mono">{c.contract_nr}</span>
                </div>
                <div className="text-[14px] text-ink font-medium truncate mt-0.5">
                  {c.vehicle_type || "Fahrzeug"}
                </div>
                <div className="text-[12px] text-ink-muted mt-0.5 font-mono tnum">
                  {fmtDate(c.pickup_date)} → {fmtDate(c.return_date)}
                  {c.total_amount != null && (
                    <span className="ml-2">· {fmtEur(c.total_amount)}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-ink-muted shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
