import { BarChart3 } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";

export default function ReportsPage() {
  return (
    <>
      <Topbar section="Auswertung" />
      <div className="flex-1 overflow-auto scroll-thin bg-stone-50 p-6 md:p-10">
        <div className="max-w-3xl mx-auto rounded-xl bg-white ring-1 ring-stone-200 p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-stone-100 text-stone-500 flex items-center justify-center">
            <BarChart3 size={22} />
          </div>
          <div className="font-display font-bold text-xl mt-4">Auswertung</div>
          <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto">
            Detail-Auswertungen über Durchsatz, Behörden, Gebühren-Quoten und Mahnstufen folgen in Kürze.
          </p>
        </div>
      </div>
    </>
  );
}
