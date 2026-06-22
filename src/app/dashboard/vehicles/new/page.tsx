import { Topbar } from "@/components/dashboard/Topbar";
import { VehicleForm } from "@/components/vehicle/VehicleForm";
import { myRole } from "@/lib/team";

export const dynamic = "force-dynamic";

export default async function NewVehiclePage() {
  const role = await myRole();
  return (
    <>
      <Topbar section="Neues Fahrzeug" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <VehicleForm mode="create" userRole={role} />
        </div>
      </div>
    </>
  );
}
