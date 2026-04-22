import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/dashboard/Topbar";
import { VehiclesClient } from "./VehiclesClient";
import type { Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("vehicles")
    .select("*")
    .order("plate", { ascending: true });
  const vehicles = (data || []) as Vehicle[];
  return (
    <>
      <Topbar section="Fahrzeuge" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-4xl mx-auto">
          <VehiclesClient initial={vehicles} />
        </div>
      </div>
    </>
  );
}
