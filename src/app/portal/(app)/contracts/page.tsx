import Link from "next/link";
import { Car, ChevronRight } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, fmtEur } from "@/lib/utils";
import { Plate } from "@/components/ui/Plate";
import { Surface } from "@/components/portal/kit/Surface";
import { SectionLabel } from "@/components/portal/kit/SectionLabel";
import { StatusBadge } from "@/components/portal/kit/StatusBadge";
import { EmptyState } from "@/components/portal/kit/EmptyState";

export const dynamic = "force-dynamic";

type CRow = {
  id: string;
  plate: string;
  vehicle_type: string | null;
  pickup_date: string;
  return_date: string;
  status: string;
  total_amount: number | null;
};

export default async function PortalMietenPage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const { data: contracts } = await admin
    .from("contracts")
    .select("id, plate, vehicle_type, pickup_date, return_date, status, total_amount")
    .eq("org_id", ctx.session.org_id)
    .eq("customer_id", ctx.session.customer_id)
    .order("pickup_date", { ascending: false });

  const list = (contracts ?? []) as CRow[];
  const active = list.filter((c) => c.status === "aktiv");
  const past = list.filter((c) => c.status !== "aktiv");

  return (
    <div className="px-5 py-4 space-y-5">
      <h1 className="font-display text-[22px] tracking-tightest font-bold text-ink px-1">
        Meine Mieten
      </h1>

      {list.length === 0 ? (
        <Surface>
          <EmptyState
            Icon={Car}
            title="Noch keine Mieten"
            text="Sobald du ein Fahrzeug mietest, erscheint es hier."
          />
        </Surface>
      ) : (
        <>
          {active.length > 0 && <Group label="Aktiv" rows={active} />}
          {past.length > 0 && <Group label="Früher" rows={past} />}
        </>
      )}
    </div>
  );
}

const Group = ({ label, rows }: { label: string; rows: CRow[] }) => (
  <div>
    <SectionLabel>{label}</SectionLabel>
    <Surface padding="p-0" className="overflow-hidden">
      <div className="divide-y divide-hairline">
        {rows.map((c) => (
          <Link
            key={c.id}
            href={`/portal/contracts/${c.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-paper/40 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Plate value={c.plate} size="sm" />
                <StatusBadge status={c.status} />
              </div>
              <div className="text-[14px] text-ink font-medium truncate mt-0.5">
                {c.vehicle_type || "Fahrzeug"}
              </div>
              <div className="text-[12px] text-ink-muted mt-0.5 font-mono tnum">
                {fmtDate(c.pickup_date)} → {fmtDate(c.return_date)}
                {c.total_amount != null && <span className="ml-2">· {fmtEur(c.total_amount)}</span>}
              </div>
            </div>
            <ChevronRight size={14} className="text-ink-muted shrink-0" />
          </Link>
        ))}
      </div>
    </Surface>
  </div>
);
