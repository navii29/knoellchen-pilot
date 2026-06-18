import Link from "next/link";
import { Car, ChevronRight } from "lucide-react";

/**
 * "Flotte heute" — Verfügbarkeit auf einen Blick: verfügbar / vermietet /
 * Werkstatt, als segmentierter Balken + Legende. Die wichtigste Live-Zahl
 * für ein Vermiet-Geschäft.
 */
export const FleetToday = ({
  available,
  rented,
  workshop,
}: {
  available: number;
  rented: number;
  workshop: number;
}) => {
  const total = available + rented + workshop;
  const seg = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const legend = [
    { label: "verfügbar", value: available, dot: "bg-emerald-500", text: "text-emerald-600" },
    { label: "vermietet", value: rented, dot: "bg-signal", text: "text-signal" },
    { label: "Werkstatt", value: workshop, dot: "bg-amber-500", text: "text-amber-600" },
  ];

  return (
    <Link
      href="/dashboard/vehicles"
      className="group glass-card glass-sheen rounded-card p-5 flex flex-col hover:-translate-y-px transition-transform"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="data-label flex items-center gap-2">
          <Car size={14} className="text-ink-muted" /> Flotte heute
        </div>
        <div className="flex items-center gap-1 text-[12px] text-ink-muted">
          {total} {total === 1 ? "Fahrzeug" : "Fahrzeuge"}
          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Segmentierter Verfügbarkeitsbalken */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-black/[0.06]">
        {available > 0 && <div className="bg-emerald-500" style={{ width: `${seg(available)}%` }} />}
        {rented > 0 && <div className="bg-signal" style={{ width: `${seg(rented)}%` }} />}
        {workshop > 0 && <div className="bg-amber-500" style={{ width: `${seg(workshop)}%` }} />}
      </div>

      {/* Legende */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {legend.map((l) => (
          <div key={l.label}>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${l.dot}`} />
              <span className={`font-display font-semibold text-[22px] leading-none tabular-nums ${l.text}`}>
                {l.value}
              </span>
            </div>
            <div className="text-[12px] text-ink-muted mt-1">{l.label}</div>
          </div>
        ))}
      </div>
    </Link>
  );
};
