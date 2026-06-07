"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertOctagon, ChevronRight, Plus } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import type { Contract, DamageReport, DamageReportStatus, Vehicle } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterTabs, SearchInput } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";

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

const DamageStatusPill = ({ status }: { status: DamageReportStatus }) => {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono font-medium tracking-tight justify-self-start"
      style={{ background: meta.bg, color: meta.text, boxShadow: `inset 0 0 0 1px ${meta.ring}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
};

const FILTERS: Array<{ value: DamageReportStatus | "alle"; label: string }> = [
  { value: "alle", label: "Alle" },
  { value: "offen", label: "Offen" },
  { value: "gemeldet", label: "Gemeldet" },
  { value: "reguliert", label: "Reguliert" },
];

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

  const counts = (v: DamageReportStatus | "alle") =>
    v === "alle" ? initial.length : initial.filter((r) => r.status === v).length;

  return (
    <>
      <PageHeader
        kicker="Schadensmanagement"
        title="Schadensberichte"
        description="Unfälle, Vandalismus, Mietschäden — mit Foto-Dokumentation und Versicherungs-Tracking."
        actions={
          <ButtonLink href="/dashboard/damage-reports/new" variant="signal" size="sm">
            <Plus size={14} /> Neuer Bericht
          </ButtonLink>
        }
      />

      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <FilterTabs
          options={FILTERS.map((f) => ({ ...f, count: counts(f.value) }))}
          value={filter}
          onChange={setFilter}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Ort, AZ, Gegner, Vertrag…"
          className="w-64"
        />
      </div>

      <div className="mt-4 panel overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[110px_148px_1fr_180px_128px_24px] gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th">
            <span>Datum</span>
            <span>Kennzeichen</span>
            <span>Ort / Beschreibung</span>
            <span>Aktenzeichen</span>
            <span>Status</span>
            <span />
          </div>
          {filtered.map((r) => {
            const v = r.vehicle_id ? vehicleById.get(r.vehicle_id) : null;
            return (
              <Link
                key={r.id}
                href={`/dashboard/damage-reports/${r.id}`}
                className="grid grid-cols-[110px_148px_1fr_180px_128px_24px] gap-3 items-center px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
              >
                <span className="font-mono tnum text-[12px] text-ink-muted">
                  {fmtDate(r.date)}
                  {r.time && <span className="text-ink-muted ml-1">{r.time}</span>}
                </span>
                {v?.plate ? (
                  <Plate value={v.plate} size="sm" />
                ) : (
                  <span className="font-mono text-ink-muted">—</span>
                )}
                <span className="truncate">
                  {r.location && <span className="text-ink">{r.location}</span>}
                  {r.description && (
                    <span className="text-ink-muted ml-2 text-[12px]">· {r.description}</span>
                  )}
                  {!r.location && !r.description && <span className="text-ink-muted">—</span>}
                </span>
                <span className="font-mono tnum text-[12px] text-ink-muted truncate">
                  {r.police_reference_nr || r.insurance_claim_nr || "—"}
                </span>
                <DamageStatusPill status={r.status} />
                <ChevronRight size={14} className="text-ink-muted" />
              </Link>
            );
          })}
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-hairline">
          {filtered.map((r) => {
            const v = r.vehicle_id ? vehicleById.get(r.vehicle_id) : null;
            return (
              <Link
                key={r.id}
                href={`/dashboard/damage-reports/${r.id}`}
                className="flex items-start gap-3 px-4 py-3 hover:bg-canvas active:bg-canvas"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DamageStatusPill status={r.status} />
                    {v?.plate && <Plate value={v.plate} size="sm" />}
                    <span className="ml-auto font-mono tnum text-[11px] text-ink-muted">
                      {fmtDate(r.date)}
                    </span>
                  </div>
                  <div className="text-[13.5px] text-ink truncate">
                    {r.location || r.description || "—"}
                  </div>
                  {(r.police_reference_nr || r.insurance_claim_nr) && (
                    <div className="text-[11px] font-mono text-ink-muted truncate">
                      {r.police_reference_nr || r.insurance_claim_nr}
                    </div>
                  )}
                </div>
                <ChevronRight size={16} className="text-ink-muted shrink-0 mt-1" />
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            Icon={AlertOctagon}
            title={q ? "Keine Berichte gefunden." : "Noch keine Schadensberichte."}
            description={q ? undefined : "Legen Sie den ersten Schadensbericht an."}
            action={
              !q ? (
                <ButtonLink href="/dashboard/damage-reports/new" variant="signal" size="sm">
                  <Plus size={14} /> Ersten Bericht erstellen
                </ButtonLink>
              ) : undefined
            }
          />
        )}
      </div>
    </>
  );
};
