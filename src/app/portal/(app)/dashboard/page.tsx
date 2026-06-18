import Link from "next/link";
import type { ReactNode } from "react";
import { Car, ChevronRight, ClipboardCheck, FileSignature, Ticket } from "lucide-react";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { fmtDate, fmtEur } from "@/lib/utils";
import { Plate } from "@/components/ui/Plate";
import { ActionCard } from "@/components/portal/kit/ActionCard";
import { RentalHero } from "@/components/portal/kit/RentalHero";
import { Surface } from "@/components/portal/kit/Surface";
import { SectionLabel } from "@/components/portal/kit/SectionLabel";
import { EmptyState } from "@/components/portal/kit/EmptyState";
import { StatusBadge } from "@/components/portal/kit/StatusBadge";

export const dynamic = "force-dynamic";

type CRow = {
  id: string;
  plate: string;
  vehicle_type: string | null;
  pickup_date: string;
  return_date: string;
  status: string;
  signed_at: string | null;
  checkin_step: number | null;
  total_amount: number | null;
};

export default async function PortalStartPage() {
  const ctx = await getPortalCustomer();
  if (!ctx) return null;

  const admin = createAdminClient();
  const [{ data: contracts }, { data: tickets }] = await Promise.all([
    admin
      .from("contracts")
      .select(
        "id, plate, vehicle_type, pickup_date, return_date, status, signed_at, checkin_step, total_amount"
      )
      .eq("org_id", ctx.session.org_id)
      .eq("customer_id", ctx.session.customer_id)
      .order("pickup_date", { ascending: false })
      .limit(20),
    admin
      .from("tickets")
      .select("id, total_charge, paid, contracts!inner(customer_id)")
      .eq("org_id", ctx.session.org_id)
      .eq("contracts.customer_id", ctx.session.customer_id)
      .limit(50),
  ]);

  const all = (contracts ?? []) as CRow[];
  const active = all.filter((c) => c.status === "aktiv");
  const past = all.filter((c) => c.status !== "aktiv");
  const openTickets = (tickets ?? []).filter(
    (t) => !t.paid && t.total_charge != null && Number(t.total_charge) > 0
  );
  const openSum = openTickets.reduce((s, t) => s + Number(t.total_charge ?? 0), 0);

  const todos: ReactNode[] = [];
  const unsigned = active.find((c) => !c.signed_at);
  if (unsigned)
    todos.push(
      <ActionCard
        key="sign"
        Icon={FileSignature}
        accent="blue"
        title="Vertrag unterschreiben"
        subtitle={unsigned.vehicle_type || unsigned.plate}
        href={`/portal/contracts/${unsigned.id}/sign`}
        cta="Los"
      />
    );
  const needCheckin = active.find((c) => c.signed_at && (c.checkin_step ?? 0) < 5);
  if (needCheckin)
    todos.push(
      <ActionCard
        key="checkin"
        Icon={ClipboardCheck}
        accent="blue"
        title="Check-in abschließen"
        subtitle={needCheckin.vehicle_type || needCheckin.plate}
        href={`/portal/contracts/${needCheckin.id}/checkin`}
        cta="Los"
      />
    );
  if (openTickets.length > 0)
    todos.push(
      <ActionCard
        key="pay"
        Icon={Ticket}
        accent="amber"
        title={`Offen: ${fmtEur(openSum)}`}
        subtitle={`${openTickets.length} Strafzettel-Weiterbelastung${openTickets.length > 1 ? "en" : ""}`}
        href="/portal/strafzettel"
        cta="Ansehen"
      />
    );

  const hero = active[0];

  return (
    <div className="px-5 py-4 space-y-5">
      {todos.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Zu erledigen</SectionLabel>
          {todos}
        </div>
      )}

      <div>
        <SectionLabel>Aktuelle Miete</SectionLabel>
        {hero ? (
          <RentalHero
            plate={hero.plate}
            vehicleType={hero.vehicle_type}
            status={hero.status}
            dateLine={`${fmtDate(hero.pickup_date)} → ${fmtDate(hero.return_date)}`}
            primary={{ label: "Details", href: `/portal/contracts/${hero.id}` }}
            secondary={
              !hero.signed_at
                ? { label: "Unterschreiben", href: `/portal/contracts/${hero.id}/sign` }
                : (hero.checkin_step ?? 0) < 5
                ? { label: "Check-in", href: `/portal/contracts/${hero.id}/checkin` }
                : undefined
            }
          />
        ) : (
          <Surface>
            <EmptyState Icon={Car} text="Aktuell läuft keine Miete." />
          </Surface>
        )}
      </div>

      {past.length > 0 && (
        <div>
          <SectionLabel>Frühere Mieten</SectionLabel>
          <Surface padding="p-0" className="overflow-hidden">
            <div className="divide-y divide-hairline">
              {past.slice(0, 5).map((c) => (
                <ContractRow key={c.id} c={c} />
              ))}
            </div>
          </Surface>
          {past.length > 5 && (
            <Link
              href="/portal/contracts"
              className="block text-center text-[13px] text-signal hover:underline py-2 mt-1"
            >
              Alle Mieten anzeigen
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const ContractRow = ({ c }: { c: CRow }) => (
  <Link
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
);
