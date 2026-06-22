import { Topbar } from "@/components/dashboard/Topbar";
import { BatchClient } from "./BatchClient";

export const dynamic = "force-dynamic";

export default function VehicleBatchPage() {
  return (
    <>
      <Topbar section="Fahrzeugscheine — Stapel" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-3xl mx-auto">
          <BatchClient />
        </div>
      </div>
    </>
  );
}
