import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, fmtEur } from "@/lib/utils";

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
      <h1 className="font-display text-[22px] tracking-tight font-medium text-stone-900 mb-3">
        Verträge
      </h1>

      {list.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-stone-200 px-5 py-8 text-center text-sm text-stone-500">
          Noch keine Verträge vorhanden.
        </div>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-stone-200 divide-y divide-stone-100 overflow-hidden">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/portal/contracts/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-[12.5px] text-stone-500">
                  <span className="font-mono text-stone-700">{c.plate}</span>
                  <span>·</span>
                  <span>{c.contract_nr}</span>
                </div>
                <div className="text-[14.5px] text-stone-900 font-medium truncate mt-0.5">
                  {c.vehicle_type || "Fahrzeug"}
                </div>
                <div className="text-[12px] text-stone-500 mt-0.5 tabular-nums">
                  {fmtDate(c.pickup_date)} → {fmtDate(c.return_date)}
                  {c.total_amount != null && (
                    <span className="ml-2">· {fmtEur(c.total_amount)}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-stone-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
