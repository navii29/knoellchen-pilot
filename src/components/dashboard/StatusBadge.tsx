import { STATUS_META } from "@/lib/theme";
import type { TicketStatus } from "@/lib/types";

export const StatusBadge = ({ status }: { status: TicketStatus }) => {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${m.bg} ${m.text} ring-1 ${m.ring}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} /> {m.label}
    </span>
  );
};
