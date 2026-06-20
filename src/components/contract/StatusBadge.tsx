import type { ContractStatus } from "@/lib/types";

const META: Record<
  ContractStatus,
  { label: string; classes: string }
> = {
  aktiv: {
    label: "Aktiv",
    classes:
      "bg-emerald-50 text-emerald-800 border border-emerald-200",
  },
  abgeschlossen: {
    label: "Abgeschlossen",
    classes:
      "bg-canvas text-ink-soft border border-hairline",
  },
  storniert: {
    label: "Storniert",
    classes:
      "bg-red-50 text-red-700 border border-red-200",
  },
};

const OVERDUE = {
  label: "Überfällig",
  classes: "bg-red-100 text-red-700 border border-red-300 font-semibold",
};

export const ContractStatusBadge = ({
  status,
  overdue = false,
}: {
  status: ContractStatus;
  overdue?: boolean;
}) => {
  const m = overdue ? OVERDUE : META[status] ?? META.aktiv;
  return (
    <span
      className={`inline-flex items-center rounded-full font-mono text-[11px] tracking-tight px-2 py-0.5 ${m.classes}`}
    >
      {m.label}
    </span>
  );
};
