import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { CalendarClient } from "./CalendarClient";
import { addDays, parseIso, toIso, viewRange, type CalView } from "@/lib/calendar";
import { myRole } from "@/lib/team";
import { redactContractPartner, redactVehicleCost } from "@/lib/redact";
import type { Contract, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

const VIEWS: CalView[] = ["week", "2week", "month"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { view?: string; date?: string };
}) {
  const supabase = createClient();

  const view: CalView = VIEWS.includes(searchParams.view as CalView)
    ? (searchParams.view as CalView)
    : "month";
  const anchor = searchParams.date ? parseIso(searchParams.date) : new Date();
  const { rangeStart, dayCount } = viewRange(view, anchor);
  const rangeStartIso = toIso(rangeStart);
  const rangeEndIso = toIso(addDays(rangeStart, dayCount - 1));
  const todayIso = toIso(new Date());

  const [isOwner, { data: vehicles }, { data: contracts }] = await Promise.all([
    (async () => (await myRole()) === "owner")(),
    supabase.from("vehicles").select("*").order("plate", { ascending: true }),
    supabase
      .from("contracts")
      .select("*")
      // Verträge die mit dem Zeitraum überlappen
      .lte("pickup_date", rangeEndIso)
      .or(
        `and(actual_return_date.is.null,return_date.gte.${rangeStartIso}),actual_return_date.gte.${rangeStartIso}`
      )
      .neq("status", "storniert"),
  ]);

  // Kosten/Partner-Felder für Mitarbeiter aus dem Client-Payload entfernen.
  const safeVehicles = ((vehicles || []) as Vehicle[]).map((v) =>
    redactVehicleCost(v, isOwner)
  );
  const safeContracts = ((contracts || []) as Contract[]).map((c) =>
    redactContractPartner(c, isOwner)
  );

  return (
    <>
      <Topbar section="Kalender" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="px-4 md:px-8 py-4 md:py-8">
          <CalendarClient
            vehicles={safeVehicles}
            contracts={safeContracts}
            view={view}
            rangeStartIso={rangeStartIso}
            dayCount={dayCount}
            anchorIso={toIso(anchor)}
            todayIso={todayIso}
          />
        </div>
      </div>
    </>
  );
}
