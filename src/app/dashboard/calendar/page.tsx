import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { CalendarClient } from "./CalendarClient";
import { addDays, mondayOfWeek, parseIso, toIso } from "@/lib/calendar";
import type { Contract, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const supabase = createClient();

  // Wochenanker: ?week=YYYY-MM-DD (beliebiger Tag) — sonst aktuelle Woche
  const anchor = searchParams.week ? parseIso(searchParams.week) : new Date();
  const weekStart = mondayOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);
  const weekStartIso = toIso(weekStart);
  const weekEndIso = toIso(weekEnd);
  const todayIso = toIso(new Date());

  const [{ data: vehicles }, { data: contracts }] = await Promise.all([
    supabase.from("vehicles").select("*").order("plate", { ascending: true }),
    supabase
      .from("contracts")
      .select("*")
      // Verträge die mit der Woche überlappen: pickup<=weekEnd UND (actual_return_date OR return_date)>=weekStart
      .lte("pickup_date", weekEndIso)
      .or(
        `and(actual_return_date.is.null,return_date.gte.${weekStartIso}),actual_return_date.gte.${weekStartIso}`
      )
      .neq("status", "storniert"),
  ]);

  return (
    <>
      <Topbar section="Kalender" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50">
        <div className="px-6 md:px-8 py-6 md:py-8">
          <CalendarClient
            vehicles={(vehicles || []) as Vehicle[]}
            contracts={(contracts || []) as Contract[]}
            weekStartIso={weekStartIso}
            todayIso={todayIso}
          />
        </div>
      </div>
    </>
  );
}
