import { Car, Coins, FileSignature, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { THEME } from "@/lib/theme";
import { fmtEur } from "@/lib/utils";
import type { Contract, Ticket, TicketLog } from "@/lib/types";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ThroughputChart } from "@/components/dashboard/ThroughputChart";
import { TicketTable } from "@/components/dashboard/TicketTable";

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
  ]);

  const allTickets = (tickets ?? []) as Ticket[];
  const allLogs = (logs ?? []) as TicketLog[];
  const recentContracts = (contracts ?? []) as Contract[];

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
      <Topbar section="Dashboard" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="p-6 space-y-6">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="font-display font-bold text-3xl tracking-tight">
                Guten Tag, {org?.name || "Team"} 👋
              </div>
              <div className="text-sm text-stone-500 mt-1">
                {today} ·{" "}
                {counts.neu === 0
                  ? "Keine offenen Eingänge"
                  : `${counts.neu} ${counts.neu === 1 ? "neuer Strafzettel wartet" : "neue Strafzettel warten"} auf Freigabe`}
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Alle Systeme online
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Aktive Verträge"
              value={activeContractCount ?? 0}
              Icon={FileSignature}
              color={THEME.primary}
              sub="Laufende Mietverträge"
            />
            <StatCard
              label="Strafzettel offen"
              value={counts.neu}
              Icon={Inbox}
              color="#f59e0b"
              sub="Warten auf Freigabe"
            />
            <StatCard
              label="Bearbeitungsgebühren"
              value={fmtEur(counts.gebuehren)}
              Icon={Coins}
              color="#059669"
              sub="Diesen Monat"
            />
            <StatCard
              label="Flotte"
              value={vehicleCount ?? 0}
              Icon={Car}
              color="#2563eb"
              sub="Fahrzeuge in der Flotte"
            />
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <ActivityFeed ticketLogs={allLogs} contracts={recentContracts} />
            <ThroughputChart data={throughput} total={throughput.reduce((s, v) => s + v, 0)} />
          </div>

          <TicketTable tickets={allTickets} />
        </div>
      </div>
    </>
  );
}
