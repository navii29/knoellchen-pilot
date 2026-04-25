"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { computeDecommission } from "@/lib/decommission";
import type { Vehicle } from "@/lib/types";

export const DecommissionAlert = ({ vehicles }: { vehicles: Vehicle[] }) => {
  const [open, setOpen] = useState(false);
  if (vehicles.length === 0) return null;

  const worst = vehicles
    .map((v) => computeDecommission(v))
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))[0];

  const headline = `${vehicles.length} ${vehicles.length === 1 ? "Fahrzeug wird" : "Fahrzeuge werden"} bald ausgesteuert`;

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
          {vehicles.map((v) => {
            const info = computeDecommission(v);
            return (
              <Link
                key={v.id}
                href={`/dashboard/vehicles/${v.id}`}
                className="grid grid-cols-[120px_1fr_180px_120px_24px] items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/50 transition"
              >
                <span className="font-mono font-semibold text-stone-900">{v.plate}</span>
                <span className="text-stone-700 truncate">{v.vehicle_type || "—"}</span>
                <span className="tabular-nums text-xs text-stone-600">
                  Aussteuerung: {fmtDate(v.decommission_date)}
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
