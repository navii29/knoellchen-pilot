"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { computeDue, EVENT_TYPE_META, type VehicleEventType } from "@/lib/vehicle-events";

export type DueAlertItem = {
  vehicle_id: string;
  plate: string;
  vehicle_label: string;
  type: VehicleEventType;
  next_due_date: string;
};

export const VehicleDueAlert = ({ items }: { items: DueAlertItem[] }) => {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const sorted = [...items].sort(
    (a, b) => (a.next_due_date < b.next_due_date ? -1 : 1)
  );
  const worst = computeDue(sorted[0].next_due_date);

  const tuevCount = items.filter((i) => i.type === "tuev").length;
  const serviceCount = items.length - tuevCount;
  const parts: string[] = [];
  if (tuevCount > 0)
    parts.push(`${tuevCount} TÜV/HU-${tuevCount === 1 ? "Termin" : "Termine"}`);
  if (serviceCount > 0)
    parts.push(`${serviceCount} Service-${serviceCount === 1 ? "Termin" : "Termine"}`);
  const headline = `${parts.join(" und ")} in den nächsten 30 Tagen fällig`;

  return (
    <div
      className="rounded-xl"
      style={{
        background: worst.bg,
        boxShadow: `inset 0 0 0 1px ${worst.ring}`,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "white", color: worst.color }}
        >
          <AlertTriangle size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: worst.textColor }}>
            {headline}
          </div>
          <div className="text-xs mt-0.5" style={{ color: worst.textColor, opacity: 0.85 }}>
            {open ? "Klick zum Einklappen" : "Klick für Details"}
          </div>
        </div>
        {open ? (
          <ChevronDown size={16} style={{ color: worst.textColor }} />
        ) : (
          <ChevronRight size={16} style={{ color: worst.textColor }} />
        )}
      </button>
      {open && (
        <div className="border-t" style={{ borderColor: worst.ring }}>
          {sorted.map((item) => {
            const info = computeDue(item.next_due_date);
            const meta = EVENT_TYPE_META[item.type];
            return (
              <Link
                key={`${item.vehicle_id}-${item.type}`}
                href={`/dashboard/vehicles/${item.vehicle_id}`}
                className="grid grid-cols-[120px_1fr_180px_140px_24px] items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/50 transition"
              >
                <span className="font-mono font-semibold text-stone-900">{item.plate}</span>
                <span className="text-stone-700 truncate">{item.vehicle_label}</span>
                <span
                  className="inline-flex items-center px-1.5 h-5 rounded text-[11px] font-medium justify-self-start"
                  style={{
                    background: meta.bg,
                    color: meta.text,
                    boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                  }}
                >
                  {meta.short} · {fmtDate(item.next_due_date)}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium justify-self-start"
                  style={{
                    background: "white",
                    color: info.textColor,
                    boxShadow: `inset 0 0 0 1px ${info.ring}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: info.color }} />
                  {info.label}
                </span>
                <ChevronRight size={14} className="text-stone-400" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
