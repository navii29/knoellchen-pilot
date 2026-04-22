import type { ContractStatus } from "@/lib/types";

const META: Record<ContractStatus, { label: string; bg: string; text: string; ring: string; dot: string }> = {
  aktiv: { label: "Aktiv", bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "#059669" },
  abgeschlossen: { label: "Abgeschlossen", bg: "bg-stone-100", text: "text-stone-700", ring: "ring-stone-200", dot: "#78716c" },
  storniert: { label: "Storniert", bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200", dot: "#dc2626" },
};

export const ContractStatusBadge = ({ status }: { status: ContractStatus }) => {
  const m = META[status] ?? META.aktiv;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${m.bg} ${m.text} ring-1 ${m.ring}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.dot }} /> {m.label}
    </span>
  );
};
