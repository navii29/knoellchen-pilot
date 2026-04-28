import { Car, Coins, FileSignature, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fmtEur } from "@/lib/utils";
import type { Contract, Ticket, TicketLog, Vehicle } from "@/lib/types";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard, HeroStat } from "@/components/dashboard/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ThroughputChart } from "@/components/dashboard/ThroughputChart";
import { TicketTable } from "@/components/dashboard/TicketTable";
import { DecommissionAlert } from "@/components/dashboard/DecommissionAlert";
import { isDecommissionAlertWindow } from "@/lib/decommission";

export const dynamic = "force-dynamic";

const buildThroughput = (tickets: Ticket[]): number[] => {
  const days = 14;
  const buckets = new Array(days).fill(0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const t of tickets) {
    const d = new Date(t.created_at);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < days) buckets[days - 1 - diff]++;
  }
  return buckets;
};

export default async function DashboardPage() {
  const supabase = createClient();
  const [
    { data: tickets },
    { data: org },
    { data: logs },
    { data: contracts },
    { count: vehicleCount },
    { count: activeContractCount },
    { data: vehicles },
  ] = await Promise.all([
    supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("organizations").select("name").single(),
    supabase
      .from("ticket_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("contracts")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase.from("vehicles").select("*", { count: "exact", head: true }),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "aktiv"),
    supabase
      .from("vehicles")
      .select("*")
      .not("decommission_date", "is", null)
      .order("decommission_date", { ascending: true }),
  ]);

  const allTickets = (tickets ?? []) as Ticket[];
  const allLogs = (logs ?? []) as TicketLog[];
  const recentContracts = (contracts ?? []) as Contract[];
  const decommissionAlerts = ((vehicles ?? []) as Vehicle[]).filter((v) =>
    isDecommissionAlertWindow(v, 21)
  );

  const counts = {
    neu: allTickets.filter((t) => t.status === "neu").length,
    gebuehren: allTickets
      .filter((t) => t.status === "weiterbelastet" || t.status === "bezahlt")
      .reduce((s, t) => s + Number(t.processing_fee || 0), 0),
  };

  const throughput = buildThroughput(allTickets);
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Topbar />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="px-4 md:px-10 py-8 md:py-12 space-y-8 max-w-[1400px]">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="text-[12px] uppercase tracking-wider text-stone-500 font-medium mb-2">
                {today}
              </div>
              <h1 className="font-display font-medium text-[32px] md:text-[44px] leading-[1.05] tracking-[-0.03em] text-stone-900">
                Guten Tag, {org?.name || "Team"}.
              </h1>
              <p className="text-[15px] text-stone-500 mt-3 max-w-2xl">
                {counts.neu === 0
                  ? "Keine offenen Eingänge — alles erledigt."
                  : `${counts.neu} ${counts.neu === 1 ? "neuer Strafzettel wartet" : "neue Strafzettel warten"} auf Freigabe.`}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 h-7 rounded-full bg-white ring-1 ring-black/[0.05] text-[12px] text-stone-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Alle Systeme online
            </div>
          </div>

          {decommissionAlerts.length > 0 && <DecommissionAlert vehicles={decommissionAlerts} />}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="col-span-2 lg:col-span-2">
              <HeroStat
                label="Strafzettel offen"
                value={counts.neu}
                Icon={Inbox}
                pulse={counts.neu > 0}
                sub={
                  counts.neu === 0
                    ? "Keine offenen Eingänge"
                    : counts.neu === 1
                    ? "Wartet auf Freigabe"
                    : "Warten auf Freigabe"
                }
              />
            </div>
            <StatCard
              label="Aktive Verträge"
              value={activeContractCount ?? 0}
              Icon={FileSignature}
              sub="Laufende Mietverträge"
            />
            <StatCard
              label="Bearbeitungsgebühren"
              value={fmtEur(counts.gebuehren)}
              Icon={Coins}
              sub="Diesen Monat"
            />
            <StatCard
              label="Flotte"
              value={vehicleCount ?? 0}
              Icon={Car}
              sub="Fahrzeuge"
            />
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
            <ActivityFeed ticketLogs={allLogs} contracts={recentContracts} />
            <ThroughputChart data={throughput} total={throughput.reduce((s, v) => s + v, 0)} />
          </div>

          <TicketTable tickets={allTickets} />
        </div>
      </div>
    </>
  );
}
