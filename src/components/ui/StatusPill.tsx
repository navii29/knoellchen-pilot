import type { TicketStatus } from "@/lib/types";

/**
 * The four-state processing pipeline — the operational heart of the product.
 * Functional status semantics (allowed beyond the single brand accent),
 * rendered as a mono-labelled chip. Used in tables, detail headers, and the
 * landing "Leitstelle" rail.
 */
export const PIPELINE: { key: TicketStatus; label: string; dot: string; soft: string; ink: string }[] = [
  { key: "neu", label: "Neu", dot: "#B45309", soft: "#FEF3E2", ink: "#92400E" },
  { key: "zugeordnet", label: "Zugeordnet", dot: "#1D4ED8", soft: "#E8EEFD", ink: "#1E40AF" },
  { key: "weiterbelastet", label: "Weiterbelastet", dot: "#6D28D9", soft: "#F1EAFB", ink: "#5B21B6" },
  { key: "bezahlt", label: "Bezahlt", dot: "#15803D", soft: "#E6F4EA", ink: "#166534" },
];

const META = Object.fromEntries(PIPELINE.map((p) => [p.key, p])) as Record<
  TicketStatus,
  (typeof PIPELINE)[number]
>;

export const StatusPill = ({
  status,
  className = "",
}: {
  status: TicketStatus;
  className?: string;
}) => {
  const m = META[status] ?? PIPELINE[0];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono font-medium tracking-tight ${className}`}
      style={{ background: m.soft, color: m.ink }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};
