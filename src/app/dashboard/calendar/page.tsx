import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { CalendarClient } from "./CalendarClient";
import { addDays, parseIso, toIso, viewRange, type CalView } from "@/lib/calendar";
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

  const [{ data: vehicles }, { data: contracts }] = await Promise.all([
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

  return (
    <>
      <Topbar section="Kalender" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas">
        <div className="px-4 md:px-8 py-4 md:py-8">
          <CalendarClient
            vehicles={(vehicles || []) as Vehicle[]}
            contracts={(contracts || []) as Contract[]}
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
