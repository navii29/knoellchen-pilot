import Link from "next/link";
import { ChevronRight, FileSignature, FileText, Inbox } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, fmtEur } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const [{ data: contracts }, { data: tickets }] = await Promise.all([
    admin
      .from("contracts")
      .select(
        "id, contract_nr, plate, vehicle_type, pickup_date, return_date, status, signed_at, total_amount"
      )
      .eq("org_id", ctx.session.org_id)
      .eq("customer_id", ctx.session.customer_id)
      .order("pickup_date", { ascending: false })
      .limit(20),
    admin
      .from("tickets")
      .select(
        "id, ticket_nr, status, total_charge, paid, created_at, contracts!inner(customer_id)"
      )
      .eq("org_id", ctx.session.org_id)
      .eq("contracts.customer_id", ctx.session.customer_id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const allContracts = contracts ?? [];
  const active = allContracts.filter((c) => c.status === "aktiv");
  const past = allContracts.filter((c) => c.status !== "aktiv");
  const openTickets = (tickets ?? []).filter(
    (t) => !t.paid && t.total_charge != null && Number(t.total_charge) > 0
  );

  return (
    <div className="px-5 py-3 space-y-5">
      {openTickets.length > 0 && (
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-wider font-semibold text-amber-800 mb-1">
            <Inbox size={13} /> Offene Beträge
          </div>
          <div className="text-[14px] text-amber-900">
            {openTickets.length}{" "}
            {openTickets.length === 1 ? "Strafzettel-Weiterbelastung" : "Strafzettel-Weiterbelastungen"} offen ·{" "}
            <span className="font-medium tabular-nums">
              {fmtEur(
                openTickets.reduce((s, t) => s + Number(t.total_charge ?? 0), 0)
              )}
            </span>
          </div>
        </div>
      )}

      <Section title="Aktive Verträge" Icon={FileSignature}>
        {active.length === 0 ? (
          <Empty text="Aktuell läuft kein Vertrag." />
        ) : (
          active.map((c) => <ContractRow key={c.id} c={c} />)
        )}
      </Section>

      {past.length > 0 && (
        <Section title="Vergangene Verträge" Icon={FileText}>
          {past.slice(0, 6).map((c) => (
            <ContractRow key={c.id} c={c} />
          ))}
          {past.length > 6 && (
            <Link
              href="/portal/contracts"
              className="block text-center text-[13px] text-indigo-700 hover:underline pt-2"
            >
              Alle {past.length} Verträge anzeigen
            </Link>
          )}
        </Section>
      )}
    </div>
  );
}

const Section = ({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof Inbox;
  children: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-2 px-1">
      <Icon size={12} />
      {title}
    </div>
    <div className="rounded-2xl bg-white ring-1 ring-zinc-200 divide-y divide-zinc-100 overflow-hidden">
      {children}
    </div>
  </div>
);

type Row = {
  id: string;
  contract_nr: string;
  plate: string;
  vehicle_type: string | null;
  pickup_date: string;
  return_date: string;
  status: string;
  signed_at: string | null;
  total_amount: number | null;
};

const ContractRow = ({ c }: { c: Row }) => (
  <Link
    href={`/portal/contracts/${c.id}`}
    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50"
  >
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[12.5px] text-zinc-700">{c.plate}</span>
        {c.signed_at && (
          <span className="inline-flex items-center px-1.5 h-4 rounded bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 text-[10.5px] font-medium">
            unterschrieben
          </span>
        )}
        {!c.signed_at && c.status === "aktiv" && (
          <span className="inline-flex items-center px-1.5 h-4 rounded bg-amber-50 ring-1 ring-amber-200 text-amber-700 text-[10.5px] font-medium">
            offen
          </span>
        )}
      </div>
      <div className="text-[14px] text-zinc-900 font-medium truncate mt-0.5">
        {c.vehicle_type || "Fahrzeug"}
      </div>
      <div className="text-[12px] text-zinc-500 mt-0.5 tabular-nums">
        {fmtDate(c.pickup_date)} → {fmtDate(c.return_date)}
        {c.total_amount != null && (
          <span className="ml-2">· {fmtEur(c.total_amount)}</span>
        )}
      </div>
    </div>
    <ChevronRight size={14} className="text-zinc-300 shrink-0" />
  </Link>
);

const Empty = ({ text }: { text: string }) => (
  <div className="px-4 py-6 text-center text-sm text-zinc-500">{text}</div>
);
