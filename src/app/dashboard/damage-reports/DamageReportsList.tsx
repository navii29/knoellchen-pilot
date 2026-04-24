"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertOctagon, ChevronRight, Plus, Search } from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtDate } from "@/lib/utils";
import type { Contract, DamageReport, DamageReportStatus, Vehicle } from "@/lib/types";

const STATUS_META: Record<
  DamageReportStatus,
  { label: string; bg: string; ring: string; color: string; text: string }
> = {
  offen: {
    label: "Offen",
    bg: "#fef2f2",
    ring: "#fecaca",
    color: "#dc2626",
    text: "#b91c1c",
  },
  gemeldet: {
    label: "Gemeldet",
    bg: "#fefce8",
    ring: "#fde68a",
    color: "#ca8a04",
    text: "#a16207",
  },
  reguliert: {
    label: "Reguliert",
    bg: "#f0fdf4",
    ring: "#bbf7d0",
    color: "#16a34a",
    text: "#15803d",
  },
};

const FILTERS: Array<DamageReportStatus | "alle"> = ["alle", "offen", "gemeldet", "reguliert"];
const FILTER_LABEL: Record<string, string> = {
  alle: "Alle",
  offen: "Offen",
  gemeldet: "Gemeldet",
  reguliert: "Reguliert",
};

export const DamageReportsList = ({
  initial,
  vehicles,
  contracts,
}: {
  initial: DamageReport[];
  vehicles: Vehicle[];
  contracts: Pick<Contract, "id" | "contract_nr" | "plate" | "renter_name">[];
}) => {
  const [filter, setFilter] = useState<DamageReportStatus | "alle">("alle");
  const [q, setQ] = useState("");

  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const contractById = useMemo(() => new Map(contracts.map((c) => [c.id, c])), [contracts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initial.filter((r) => {
      if (filter !== "alle" && r.status !== filter) return false;
      if (!needle) return true;
      const v = r.vehicle_id ? vehicleById.get(r.vehicle_id) : null;
      const c = r.contract_id ? contractById.get(r.contract_id) : null;
      return [
        r.location,
        r.description,
        r.police_reference_nr,
        r.insurance_claim_nr,
        r.other_party_name,
        r.other_party_plate,
        v?.plate,
        c?.contract_nr,
        c?.renter_name,
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(needle));
    });
  }, [initial, filter, q, vehicleById, contractById]);

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="font-display font-bold text-2xl tracking-tight">Schadensberichte</div>
          <p className="text-sm text-stone-500 mt-1">
            Unfälle, Vandalismus, Mietschäden — mit Foto-Dokumentation und Versicherungs-Tracking.
          </p>
        </div>
        <Link
          href="/dashboard/damage-reports/new"
          className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium"
          style={{ background: THEME.primary }}
        >
          <Plus size={14} /> Neuer Bericht
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
              {FILTER_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ort, AZ, Gegner, Vertrag…"
            className="pl-8 pr-3 py-2 bg-white rounded-md text-sm ring-1 ring-stone-200 w-72 outline-none focus:ring-stone-400"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
        <div className="grid grid-cols-[110px_110px_1fr_180px_120px_24px] gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
          <span>Datum</span>
          <span>Kennzeichen</span>
          <span>Ort / Beschreibung</span>
          <span>Aktenzeichen</span>
          <span>Status</span>
          <span></span>
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-stone-500">
            <AlertOctagon size={28} className="mx-auto text-stone-300" />
            <div className="mt-3">
              {q ? "Keine Berichte gefunden." : "Noch keine Schadensberichte."}
            </div>
            {!q && (
              <Link
                href="/dashboard/damage-reports/new"
                className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium mt-4"
                style={{ background: THEME.primary }}
              >
                <Plus size={14} /> Ersten Bericht erstellen
              </Link>
            )}
          </div>
        )}
        {filtered.map((r) => {
          const v = r.vehicle_id ? vehicleById.get(r.vehicle_id) : null;
          const meta = STATUS_META[r.status];
          return (
            <Link
              key={r.id}
              href={`/dashboard/damage-reports/${r.id}`}
              className="grid grid-cols-[110px_110px_1fr_180px_120px_24px] gap-3 items-center px-5 py-3 border-b border-stone-50 last:border-0 text-sm hover:bg-stone-50"
            >
              <span className="font-mono text-xs">
                {fmtDate(r.date)}
                {r.time && <span className="text-stone-400 ml-1">{r.time}</span>}
              </span>
              <span className="font-mono font-semibold">{v?.plate || "—"}</span>
              <span className="truncate">
                {r.location && <span className="text-stone-900">{r.location}</span>}
                {r.description && (
                  <span className="text-stone-400 ml-2 text-xs">· {r.description}</span>
                )}
                {!r.location && !r.description && <span className="text-stone-400">—</span>}
              </span>
              <span className="text-xs text-stone-500 truncate font-mono">
                {r.police_reference_nr || r.insurance_claim_nr || "—"}
              </span>
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
              <ChevronRight size={14} className="text-stone-300" />
            </Link>
          );
        })}
      </div>
    </>
  );
};
