import Link from "next/link";
import { Layers } from "lucide-react";
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
          <Link
            href="/dashboard/vehicles/batch"
            className="mb-4 flex items-center gap-2.5 rounded-card border border-hairline bg-paper px-4 py-3 text-[13px] text-ink-soft hover:border-signal/40 hover:text-ink transition-colors"
          >
            <Layers size={16} className="text-signal shrink-0" />
            <span>
              <strong className="text-ink">Mehrere Fahrzeugscheine?</strong> Stapel-Import — mehrere
              Dateien oder ein PDF mit mehreren Autos auf einmal einlesen.
            </span>
          </Link>
          <VehicleForm mode="create" userRole={role} />
        </div>
      </div>
    </>
  );
}
