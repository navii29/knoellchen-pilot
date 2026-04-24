import { Topbar } from "@/components/dashboard/Topbar";
import { createClient } from "@/lib/supabase/server";
import { NewDamageReportClient } from "./NewDamageReportClient";
import type { Contract, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewDamageReportPage({
  searchParams,
}: {
  searchParams: { contract_id?: string; vehicle_id?: string };
}) {
  const supabase = createClient();
  const [{ data: vehicles }, { data: contracts }] = await Promise.all([
    supabase.from("vehicles").select("*").order("plate", { ascending: true }),
    supabase
      .from("contracts")
      .select("id, contract_nr, plate, renter_name, vehicle_id, pickup_date, return_date")
      .order("pickup_date", { ascending: false }),
  ]);

  return (
    <>
      <Topbar section="Neuer Schadensbericht" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-3xl mx-auto">
          <NewDamageReportClient
            vehicles={(vehicles || []) as Vehicle[]}
            contracts={(contracts || []) as Array<
              Pick<Contract, "id" | "contract_nr" | "plate" | "renter_name" | "vehicle_id" | "pickup_date" | "return_date">
            >}
            initialContractId={searchParams.contract_id || null}
            initialVehicleId={searchParams.vehicle_id || null}
          />
        </div>
      </div>
    </>
  );
}
