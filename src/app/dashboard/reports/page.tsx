import Link from "next/link";
import { BarChart3, ChevronRight, Wallet } from "lucide-react";
import { Topbar } from "@/components/dashboard/Topbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";

export default function ReportsPage() {
  return (
    <>
      <Topbar section="Auswertung" />
      <div className="flex-1 overflow-auto scroll-thin bg-canvas p-4 md:p-10">
        <div className="max-w-3xl mx-auto space-y-4">
          <PageHeader kicker="Leitstelle · Reports" title="Auswertung" className="mb-6" />

          <Link
            href="/dashboard/reports/margin"
            className="group block panel p-6 hover:border-ink/20 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 shrink-0 rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-muted">
                <Wallet size={20} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[15px] tracking-tight text-ink">Margen</div>
                <p className="text-[13px] text-ink-muted mt-0.5">
                  Ist-VK, EK und Marge pro Fahrzeug und für die Flotte — wahlweise 7/30/90 Tage oder eigener Zeitraum, inkl. PDF-Export.
                </p>
              </div>
              <ChevronRight
                size={16}
                className="text-ink-muted group-hover:text-ink transition shrink-0"
              />
            </div>
          </Link>

          <Panel className="p-12 text-center">
            <div className="w-11 h-11 mx-auto rounded-panel border border-hairline bg-canvas flex items-center justify-center text-ink-muted">
              <BarChart3 size={20} strokeWidth={1.75} />
            </div>
            <div className="font-display font-bold text-[17px] tracking-tight text-ink mt-4">Weitere Auswertungen</div>
            <p className="text-[13px] text-ink-muted mt-2 max-w-md mx-auto">
              Detail-Auswertungen über Durchsatz, Behörden, Gebühren-Quoten und Mahnstufen folgen in Kürze.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
