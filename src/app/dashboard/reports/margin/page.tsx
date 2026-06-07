import { Topbar } from "@/components/dashboard/Topbar";
import { MarginClient } from "./MarginClient";

export const dynamic = "force-dynamic";

export default function MarginReportPage() {
  return (
    <>
      <Topbar section="Auswertung · Margen" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          <MarginClient />
        </div>
      </div>
    </>
  );
}
