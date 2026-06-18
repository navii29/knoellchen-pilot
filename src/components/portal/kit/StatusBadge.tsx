// Status-Pille mit Pipeline-Semantik (Neu=Amber, Zugeordnet/Aktiv=Blau,
// Weiterbelastet=Violett, Bezahlt/Abgeschlossen=Emerald).
const MAP: Record<string, { label: string; cls: string }> = {
  neu: { label: "Neu", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  offen: { label: "Offen", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  zugeordnet: { label: "Zugeordnet", cls: "bg-signal-soft text-signal-ink border-blue-200" },
  aktiv: { label: "Aktiv", cls: "bg-signal-soft text-signal-ink border-blue-200" },
  weiterbelastet: { label: "Weiterbelastet", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  bezahlt: { label: "Bezahlt", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  abgeschlossen: { label: "Abgeschlossen", cls: "bg-frost text-ink-soft border-hairline" },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const m = MAP[status] ?? {
    label: status,
    cls: "bg-frost text-ink-soft border-hairline",
  };
  return (
    <span
      className={`inline-flex items-center px-2 h-5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${m.cls}`}
    >
      {m.label}
    </span>
  );
};
