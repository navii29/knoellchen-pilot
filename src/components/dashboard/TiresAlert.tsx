"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Disc } from "lucide-react";
import { TIRE_TYPE_META } from "@/lib/tires";
import type { TireAlertItem } from "@/lib/tire-alerts";

export type { TireAlertItem } from "@/lib/tire-alerts";

export const TiresAlert = ({ items }: { items: TireAlertItem[] }) => {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const lowCount = items.filter((i) => i.reason !== "season_mismatch").length;
  const seasonCount = items.filter((i) => i.reason !== "low_tread").length;
  const parts: string[] = [];
  if (lowCount > 0)
    parts.push(`${lowCount} mit niedriger Profiltiefe`);
  if (seasonCount > 0)
    parts.push(`${seasonCount} mit falscher Saison-Bereifung`);
  const headline = `Reifen-Hinweis: ${parts.join(" und ")}`;

  // Worst-Color → wenn irgendein low_tread vorhanden = rot, sonst gelb
  const hasCritical = lowCount > 0;
  const tone = hasCritical
    ? { bg: "#fef2f2", ring: "#fecaca", color: "#dc2626", text: "#b91c1c" }
    : { bg: "#fefce8", ring: "#fde68a", color: "#ca8a04", text: "#a16207" };

  return (
    <div
      className="rounded-xl"
      style={{
        background: tone.bg,
        boxShadow: `inset 0 0 0 1px ${tone.ring}`,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "white", color: tone.color }}
        >
          {hasCritical ? <AlertTriangle size={16} /> : <Disc size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium" style={{ color: tone.text }}>
            {headline}
          </div>
          <div className="text-xs mt-0.5" style={{ color: tone.text, opacity: 0.85 }}>
            {open ? "Klick zum Einklappen" : "Klick für Details"}
          </div>
        </div>
        {open ? (
          <ChevronDown size={16} style={{ color: tone.text }} />
        ) : (
          <ChevronRight size={16} style={{ color: tone.text }} />
        )}
      </button>
      {open && (
        <div className="border-t" style={{ borderColor: tone.ring }}>
          {items.map((item) => {
            const meta = TIRE_TYPE_META[item.tire_type];
            const isLow = item.reason !== "season_mismatch";
            const isMismatch = item.reason !== "low_tread";
            return (
              <Link
                key={`${item.vehicle_id}-${item.reason}`}
                href={`/dashboard/vehicles/${item.vehicle_id}`}
                className="grid grid-cols-[120px_1fr_auto] items-center gap-3 px-5 py-2.5 text-sm hover:bg-white/50 transition"
              >
                <span className="font-mono font-semibold text-stone-900">{item.plate}</span>
                <span className="text-stone-700 truncate">{item.vehicle_label}</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[11px] font-medium"
                    style={{
                      background: meta.bg,
                      color: meta.text,
                      boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                    }}
                  >
                    {meta.short}
                  </span>
                  {isLow && item.min_tread_mm != null && (
                    <span className="inline-flex items-center px-1.5 h-5 rounded text-[11px] font-mono font-semibold bg-rose-50 text-rose-700 ring-1 ring-rose-200 tabular-nums">
                      {item.min_tread_mm.toFixed(1).replace(".", ",")} mm
                    </span>
                  )}
                  {isMismatch && (
                    <span className="inline-flex items-center px-1.5 h-5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 ring-1 ring-amber-200">
                      {item.tire_type === "summer" ? "Winter empfohlen" : "Sommer empfohlen"}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
