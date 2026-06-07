"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import { computeDecommission } from "@/lib/decommission";
import type { Vehicle } from "@/lib/types";
import { Plate } from "@/components/ui/Plate";

export const DecommissionAlert = ({ vehicles }: { vehicles: Vehicle[] }) => {
  const [open, setOpen] = useState(false);
  if (vehicles.length === 0) return null;

  const worst = vehicles
    .map((v) => computeDecommission(v))
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))[0];

  const headline = `${vehicles.length} ${vehicles.length === 1 ? "Fahrzeug wird" : "Fahrzeuge werden"} bald ausgesteuert`;

  return (
    <div
      className="rounded-card border"
      style={{
        background: worst.bg,
        borderColor: worst.ring,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        <div
          className="w-8 h-8 rounded-panel border flex items-center justify-center shrink-0"
          style={{ background: "white", color: worst.color, borderColor: worst.ring }}
        >
          <AlertTriangle size={15} strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium" style={{ color: worst.textColor }}>
            {headline}
          </div>
          <div className="font-mono text-[11px] mt-0.5" style={{ color: worst.textColor, opacity: 0.75 }}>
            {open ? "Klick zum Einklappen" : "Klick für Details"}
          </div>
        </div>
        {open ? (
          <ChevronDown size={15} style={{ color: worst.textColor }} />
        ) : (
          <ChevronRight size={15} style={{ color: worst.textColor }} />
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
                className="grid grid-cols-[auto_1fr_180px_120px_24px] items-center gap-3 px-5 py-2.5 text-[13px] hover:bg-white/40 transition-colors"
              >
                <Plate value={v.plate} size="sm" />
                <span className="text-ink truncate">{v.vehicle_type || "—"}</span>
                <span className="font-mono tnum text-[11.5px] text-ink-soft">
                  Aussteuerung: {fmtDate(v.decommission_date)}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium justify-self-start border"
                  style={{
                    background: "white",
                    color: info.textColor,
                    borderColor: info.ring,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: info.color }} />
                  {info.label}
                </span>
                <ChevronRight size={14} className="text-ink-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
