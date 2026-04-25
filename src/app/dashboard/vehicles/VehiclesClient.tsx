"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtDate } from "@/lib/utils";
import { computeDecommission } from "@/lib/decommission";
import { VEHICLE_STATUS_META, VEHICLE_STATUSES, buildVehicleType } from "@/lib/vehicle";
import type { Vehicle, VehicleStatus } from "@/lib/types";

const FILTERS: Array<VehicleStatus | "alle"> = ["alle", ...VEHICLE_STATUSES];
const FILTER_LABELS: Record<string, string> = {
  alle: "Alle",
  aktiv: "Aktiv",
  inaktiv: "Inaktiv",
  werkstatt: "Werkstatt",
  ausgesteuert: "Ausgesteuert",
};

export const VehiclesClient = ({ initial }: { initial: Vehicle[] }) => {
  const router = useRouter();
  const [filter, setFilter] = useState<VehicleStatus | "alle">("alle");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initial.filter((v) => {
      if (filter !== "alle" && v.status !== filter) return false;
      if (!needle) return true;
      const name = buildVehicleType(v.manufacturer, v.model) || v.vehicle_type || "";
      return [
        v.plate,
        name,
        v.color,
        v.body_type,
        v.category,
        v.fin_number,
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(needle));
    });
  }, [initial, filter, q]);

  const remove = async (id: string) => {
    if (!confirm("Fahrzeug wirklich löschen?")) return;
    const res = await fetch(`/api/vehicles?id=${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  };

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="font-display font-bold text-2xl tracking-tight">Fahrzeuge</div>
          <p className="text-sm text-stone-500 mt-1">
            Stammdaten, Verfügbarkeit, Preise — alles in einem Datensatz pro Auto.
          </p>
        </div>
        <Link
          href="/dashboard/vehicles/new"
          className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium"
          style={{ background: THEME.primary }}
        >
          <Plus size={14} /> Neues Fahrzeug
        </Link>
      </div>

      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 text-xs flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1.5 rounded-md ${
                filter === f ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kennzeichen, Modell, FIN…"
            className="pl-8 pr-3 py-2 bg-white rounded-md text-sm ring-1 ring-stone-200 w-72 outline-none focus:ring-stone-400"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[120px_1fr_140px_120px_140px_120px_70px] gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
            <span>Kennzeichen</span>
            <span>Hersteller / Modell</span>
            <span>Karosserie</span>
            <span className="text-right">Km-Stand</span>
            <span>Erstzulassung</span>
            <span>Status</span>
            <span></span>
          </div>
          {filtered.map((v) => {
            const meta = VEHICLE_STATUS_META[v.status];
            const decom = computeDecommission(v);
            const name = buildVehicleType(v.manufacturer, v.model) || v.vehicle_type || "—";
            return (
              <div
                key={v.id}
                className="grid grid-cols-[120px_1fr_140px_120px_140px_120px_70px] gap-3 items-center px-5 py-3 border-b border-stone-50 last:border-0 text-sm hover:bg-stone-50"
              >
                <Link href={`/dashboard/vehicles/${v.id}`} className="font-mono font-semibold">
                  {v.plate}
                </Link>
                <Link href={`/dashboard/vehicles/${v.id}`} className="text-stone-700 truncate">
                  {name}
                  {v.color && (
                    <span className="text-stone-400 text-xs ml-2">· {v.color}</span>
                  )}
                </Link>
                <Link href={`/dashboard/vehicles/${v.id}`} className="text-xs text-stone-500 truncate">
                  {v.body_type || "—"}
                  {v.category && (
                    <span className="text-stone-400 ml-1">· {v.category}</span>
                  )}
                </Link>
                <Link
                  href={`/dashboard/vehicles/${v.id}`}
                  className="text-xs text-stone-500 text-right tabular-nums"
                >
                  {v.km_at_intake != null ? v.km_at_intake.toLocaleString("de-DE") : "—"}
                </Link>
                <Link
                  href={`/dashboard/vehicles/${v.id}`}
                  className="text-xs text-stone-500 tabular-nums"
                >
                  {v.first_registration ? fmtDate(v.first_registration) : "—"}
                  {v.decommission_date && (
                    <div className="text-[10px]" style={{ color: decom.textColor }}>
                      {decom.label}
                    </div>
                  )}
                </Link>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium justify-self-start"
                  style={{
                    background: meta.bg,
                    color: meta.text,
                    boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                  {meta.label}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/dashboard/vehicles/${v.id}`}
                    className="text-stone-400 hover:text-stone-700 p-1.5"
                    title="Detail"
                  >
                    <ChevronRight size={14} />
                  </Link>
                  <button
                    onClick={() => remove(v.id)}
                    className="text-stone-400 hover:text-red-600 p-1.5"
                    title="Löschen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-stone-100">
          {filtered.map((v) => {
            const meta = VEHICLE_STATUS_META[v.status];
            const name = buildVehicleType(v.manufacturer, v.model) || v.vehicle_type || "—";
            return (
              <div key={v.id} className="flex items-start gap-3 px-4 py-3">
                <Link
                  href={`/dashboard/vehicles/${v.id}`}
                  className="flex-1 min-w-0 flex items-start gap-3 active:bg-stone-100 -mx-4 -my-3 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
                    <Car size={16} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold text-sm">{v.plate}</span>
                      <span
                        className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          background: meta.bg,
                          color: meta.text,
                          boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                        }}
                      >
                        <span className="w-1 h-1 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-xs text-stone-700 truncate">{name}</div>
                    <div className="text-[11px] text-stone-400 truncate">
                      {[v.body_type, v.color, v.first_registration && fmtDate(v.first_registration)]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => remove(v.id)}
                  className="touch-target flex items-center justify-center text-stone-400 hover:text-red-600"
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-stone-500">
            <Car size={28} className="mx-auto text-stone-300" />
            <div className="mt-3">
              {q ? "Keine Fahrzeuge gefunden." : "Noch keine Fahrzeuge."}
            </div>
            {!q && (
              <Link
                href="/dashboard/vehicles/new"
                className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium mt-4"
                style={{ background: THEME.primary }}
              >
                <Plus size={14} /> Erstes Fahrzeug anlegen
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
};
