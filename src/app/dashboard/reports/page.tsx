import Link from "next/link";
import { BarChart3, ChevronRight, Wallet } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";

export default function ReportsPage() {
  return (
    <>
      <Topbar section="Auswertung" />
      <div className="flex-1 overflow-auto scroll-thin bg-zinc-50 p-4 md:p-10">
        <div className="max-w-3xl mx-auto space-y-4">
          <Link
            href="/dashboard/reports/margin"
            className="group block rounded-xl bg-white ring-1 ring-zinc-200 p-6 hover:ring-zinc-300 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-lg">Margen</div>
                <p className="text-sm text-zinc-500 mt-0.5">
                  Ist-VK, EK und Marge pro Fahrzeug und für die Flotte — wahlweise 7/30/90 Tage oder eigener Zeitraum, inkl. PDF-Export.
                </p>
              </div>
              <ChevronRight
                size={18}
                className="text-zinc-400 group-hover:text-zinc-700 transition shrink-0"
              />
            </div>
          </Link>

          <div className="rounded-xl bg-white ring-1 ring-zinc-200 p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center">
              <BarChart3 size={22} />
            </div>
            <div className="font-display font-bold text-xl mt-4">Weitere Auswertungen</div>
            <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
              Detail-Auswertungen über Durchsatz, Behörden und Gebühren-Quoten
              entwickeln wir gemeinsam mit unseren Pilot-Kunden. Sagen Sie uns,
              was Sie brauchen.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
