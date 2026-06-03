import { Topbar } from "@/components/dashboard/Topbar";
import { VehicleForm } from "@/components/vehicle/VehicleForm";

export const dynamic = "force-dynamic";

export default function NewVehiclePage() {
  return (
    <>
      <Topbar section="Neues Fahrzeug" />
      <div className="flex-1 overflow-auto scroll-thin bg-zinc-50 p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <VehicleForm mode="create" />
        </div>
      </div>
    </>
  );
}
