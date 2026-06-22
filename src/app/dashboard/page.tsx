import {
  AlertOctagon,
  ClipboardCheck,
  Coins,
  FileSignature,
  FileText,
  RotateCcw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fmtEur } from "@/lib/utils";
import type { Contract, Ticket, TicketLog, Vehicle } from "@/lib/types";
import { Topbar } from "@/components/dashboard/Topbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActionBar } from "@/components/dashboard/ActionBar";
import { FleetToday } from "@/components/dashboard/FleetToday";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { ThroughputChart } from "@/components/dashboard/ThroughputChart";
import { TicketTable } from "@/components/dashboard/TicketTable";
import { DecommissionAlert } from "@/components/dashboard/DecommissionAlert";
import { VehicleDueAlert, type DueAlertItem } from "@/components/dashboard/VehicleDueAlert";
import { PricingTodayWidget } from "@/components/dashboard/PricingTodayWidget";
import { MarginWidget } from "@/components/dashboard/MarginWidget";
import { TiresAlert } from "@/components/dashboard/TiresAlert";
import { buildTireAlerts } from "@/lib/tire-alerts";
import { isDecommissionAlertWindow } from "@/lib/decommission";
import { buildVehicleType } from "@/lib/vehicle";
import type { VehicleEventType } from "@/lib/vehicle-events";
import type { VehicleTire } from "@/lib/tires";

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

const localToday = (): string => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate()
  ).padStart(2, "0")}`;
};

type ActiveContractRow = {
  id: string;
  vehicle_id: string | null;
  pickup_date: string | null;
  return_date: string | null;
  actual_return_date: string | null;
  checkin_step: number | null;
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("users").select("org_id, role").eq("id", user.id).single()
    : { data: null };
  const orgId = (profile as { org_id?: string } | null)?.org_id ?? null;
  const isOwner = (profile as { role?: string } | null)?.role === "owner";

  const todayIso = localToday();

  const [
    { data: tickets },
    { data: org },
    { data: logs },
    { data: recentContracts },
    { data: vehicles },
    { data: activeContractsRaw },
    { count: schaedenOffen },
  ] = await Promise.all([
    supabase.from("tickets").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("organizations").select("name").single(),
    supabase.from("ticket_logs").select("*").order("created_at", { ascending: false }).limit(8),
    supabase.from("contracts").select("*").order("updated_at", { ascending: false }).limit(8),
    supabase
      .from("vehicles")
      .select("id, status, plate, manufacturer, model, vehicle_type, decommission_date"),
    supabase
      .from("contracts")
      .select("id, vehicle_id, pickup_date, return_date, actual_return_date, checkin_step")
      .eq("status", "aktiv"),
    supabase.from("damage_reports").select("*", { count: "exact", head: true }).eq("status", "offen"),
  ]);

  // ── Alerts (TÜV/Service fällig) ─────────────────────────────────
  const dueWindowEnd = new Date();
  dueWindowEnd.setHours(0, 0, 0, 0);
  dueWindowEnd.setDate(dueWindowEnd.getDate() + 30);
  const horizonIso = dueWindowEnd.toISOString().slice(0, 10);

  const { data: dueEventsRaw } = await supabase
    .from("vehicle_events")
    .select(
      "vehicle_id, type, next_due_date, vehicles!inner(id, plate, manufacturer, model, vehicle_type)"
    )
    .gte("next_due_date", todayIso)
    .lte("next_due_date", horizonIso)
    .in("type", ["tuev", "service"])
    .order("next_due_date", { ascending: true });

  type DueVehicle = {
    id: string;
    plate: string;
    manufacturer: string | null;
    model: string | null;
    vehicle_type: string | null;
  };
  type DueRow = {
    vehicle_id: string;
    type: string;
    next_due_date: string;
    vehicles: DueVehicle | DueVehicle[] | null;
  };

  const dueByKey = new Map<string, DueAlertItem>();
  for (const row of (dueEventsRaw ?? []) as unknown as DueRow[]) {
    const vehicleObj: DueVehicle | null = Array.isArray(row.vehicles)
      ? row.vehicles[0] ?? null
      : row.vehicles;
    if (!vehicleObj || !row.next_due_date) continue;
    const key = `${row.vehicle_id}-${row.type}`;
    if (dueByKey.has(key)) continue;
    dueByKey.set(key, {
      vehicle_id: row.vehicle_id,
      plate: vehicleObj.plate,
      vehicle_label:
        buildVehicleType(vehicleObj.manufacturer, vehicleObj.model) ||
        vehicleObj.vehicle_type ||
        "Fahrzeug",
      type: row.type as VehicleEventType,
      next_due_date: row.next_due_date,
    });
  }
  const dueAlerts = Array.from(dueByKey.values());

  const { data: tireRows } = await supabase
    .from("vehicle_tires")
    .select("*, vehicles!inner(id, plate, manufacturer, model, vehicle_type)")
    .eq("is_current", true);
  type TireWithVehicle = VehicleTire & {
    vehicles:
      | { id: string; plate: string; manufacturer: string | null; model: string | null; vehicle_type: string | null }
      | Array<{ id: string; plate: string; manufacturer: string | null; model: string | null; vehicle_type: string | null }>
      | null;
  };
  const tiresForAlert = ((tireRows ?? []) as unknown as TireWithVehicle[]).map((t) => ({
    ...t,
    vehicles: Array.isArray(t.vehicles) ? t.vehicles[0] ?? null : t.vehicles,
  }));
  const tireAlerts = buildTireAlerts(tiresForAlert);

  // ── Daten aufbereiten ───────────────────────────────────────────
  const allTickets = (tickets ?? []) as Ticket[];
  const allLogs = (logs ?? []) as TicketLog[];
  const recent = (recentContracts ?? []) as Contract[];
  const allVehicles = (vehicles ?? []) as Vehicle[];
  const active = (activeContractsRaw ?? []) as ActiveContractRow[];

  const decommissionAlerts = allVehicles.filter((v) => isDecommissionAlertWindow(v, 45));

  // Handlungsbedarf-Zähler
  const neu = allTickets.filter((t) => t.status === "neu").length;
  const rueckgabenFaellig = active.filter(
    (c) => c.actual_return_date == null && c.return_date != null && c.return_date <= todayIso
  ).length;
  const checkinsOffen = active.filter((c) => (c.checkin_step ?? 0) < 5).length;

  // Flotte heute
  const werkstatt = allVehicles.filter((v) => v.status === "werkstatt").length;
  const aktivVehicles = allVehicles.filter((v) => v.status === "aktiv");
  const rentedIds = new Set(
    active
      .filter(
        (c) =>
          c.vehicle_id &&
          c.actual_return_date == null &&
          (c.pickup_date ?? "0000-00-00") <= todayIso &&
          (c.return_date ?? "9999-99-99") >= todayIso
      )
      .map((c) => c.vehicle_id as string)
  );
  const vermietet = aktivVehicles.filter((v) => rentedIds.has(v.id)).length;
  const verfuegbar = Math.max(0, aktivVehicles.length - vermietet);

  const gebuehren = allTickets
    .filter((t) => t.status === "weiterbelastet" || t.status === "bezahlt")
    .reduce((s, t) => s + Number(t.processing_fee || 0), 0);

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
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="px-4 md:px-10 py-8 md:py-12 space-y-8 max-w-[1400px]">
          {/* Header */}
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="kicker text-ink-muted mb-2">{today}</div>
              <h1 className="font-display font-extrabold text-[32px] md:text-[44px] leading-[1.05] tracking-tightest text-ink">
                Guten Tag, {org?.name || "Team"}.
              </h1>
              <p className="text-[15px] text-ink-muted mt-3 max-w-2xl">
                {neu === 0
                  ? "Keine offenen Eingänge — alles erledigt."
                  : `${neu} ${neu === 1 ? "neuer Strafzettel wartet" : "neue Strafzettel warten"} auf Freigabe.`}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 h-7 rounded-full border border-hairline bg-paper text-[12px] text-ink-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Alle Systeme online
            </div>
          </div>

          {/* Handlungsbedarf — die laute Zeile */}
          <ActionBar
            items={[
              { label: "Strafzettel offen", count: neu, href: "/dashboard/tickets", Icon: FileText },
              { label: "Rückgaben fällig", count: rueckgabenFaellig, href: "/dashboard/contracts", Icon: RotateCcw },
              { label: "Check-ins offen", count: checkinsOffen, href: "/dashboard/contracts", Icon: ClipboardCheck },
              { label: "Schäden offen", count: schaedenOffen ?? 0, href: "/dashboard/damage-reports", Icon: AlertOctagon },
            ]}
          />

          {/* Kontext-Warnungen (nur wenn relevant) */}
          {decommissionAlerts.length > 0 && <DecommissionAlert vehicles={decommissionAlerts} />}
          {dueAlerts.length > 0 && <VehicleDueAlert items={dueAlerts} />}
          {tireAlerts.length > 0 && <TiresAlert items={tireAlerts} />}

          {/* Flotte heute + Kennzahlen */}
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
            <FleetToday available={verfuegbar} rented={vermietet} workshop={werkstatt} />
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Aktive Verträge"
                value={active.length}
                Icon={FileSignature}
                sub="Laufende Mietverträge"
              />
              <StatCard
                label="Bearbeitungsgebühren"
                value={fmtEur(gebuehren)}
                Icon={Coins}
                sub="Diesen Monat"
              />
            </div>
          </div>

          {/* Verlauf */}
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
            <ActivityFeed ticketLogs={allLogs} contracts={recent} />
            <ThroughputChart data={throughput} total={throughput.reduce((s, v) => s + v, 0)} />
          </div>

          <TicketTable tickets={allTickets} />

          {/* Optimierung — sekundär, ruhig */}
          {orgId && (
            <div>
              <div className="kicker text-ink-muted mb-3">Optimierung</div>
              <div className="grid lg:grid-cols-2 gap-4">
                {isOwner && <MarginWidget orgId={orgId} />}
                <PricingTodayWidget orgId={orgId} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
