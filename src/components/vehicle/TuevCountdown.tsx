import { ShieldCheck } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { computeDue, type VehicleEvent } from "@/lib/vehicle-events";

const findLatestTuevDue = (events: VehicleEvent[]): string | null => {
  const sorted = events
    .filter((e) => e.type === "tuev" && e.next_due_date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return sorted[0]?.next_due_date ?? null;
};

export const TuevCountdown = ({ events }: { events: VehicleEvent[] }) => {
  const dueDate = findLatestTuevDue(events);
  if (!dueDate) return null;
  const due = computeDue(dueDate);

  return (
    <div
      className="mt-6 rounded-card border p-5 md:p-6 flex items-center gap-4 md:gap-5"
      style={{ background: due.bg, borderColor: due.ring }}
    >
      <div
        className="w-12 h-12 md:w-14 md:h-14 rounded-frame flex items-center justify-center shrink-0 bg-paper"
        style={{ color: due.color }}
      >
        <ShieldCheck size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="data-label mb-0.5" style={{ color: due.textColor }}>
          Nächste HU / TÜV
        </div>
        <div
          className="font-display font-semibold text-xl md:text-2xl mt-0.5"
          style={{ color: due.textColor }}
        >
          {fmtDate(dueDate)}
        </div>
        <div className="text-sm mt-1" style={{ color: due.textColor }}>
          {due.label}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className="font-mono font-bold text-3xl md:text-4xl tabular-nums"
          style={{ color: due.color }}
        >
          {due.daysLeft != null ? Math.abs(due.daysLeft) : "—"}
        </div>
        <div className="data-label" style={{ color: due.textColor }}>
          {due.daysLeft != null && due.daysLeft >= 0 ? "Tage" : "überfällig"}
        </div>
      </div>
    </div>
  );
};
