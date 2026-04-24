import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { DamageReportsList } from "./DamageReportsList";
import type { Contract, DamageReport, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DamageReportsPage() {
  const supabase = createClient();
  const [{ data: reports }, { data: vehicles }, { data: contracts }] = await Promise.all([
    supabase
      .from("damage_reports")
      .select("*")
      .order("date", { ascending: false })
      .limit(500),
    supabase.from("vehicles").select("*").order("plate", { ascending: true }),
    supabase.from("contracts").select("id, contract_nr, plate, renter_name").order("pickup_date", { ascending: false }),
  ]);

  return (
    <>
      <Topbar section="Schadensberichte" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <DamageReportsList
            initial={(reports || []) as DamageReport[]}
            vehicles={(vehicles || []) as Vehicle[]}
            contracts={(contracts || []) as Pick<Contract, "id" | "contract_nr" | "plate" | "renter_name">[]}
          />
        </div>
      </div>
    </>
  );
}
