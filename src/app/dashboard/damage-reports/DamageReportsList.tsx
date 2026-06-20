"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertOctagon, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import type { Contract, DamageReport, DamageReportStatus, Vehicle } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterTabs, SearchInput } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";
import {
  BulkBar,
  SelectCheckbox,
  useRowSelection,
} from "@/components/dashboard/bulk-select";

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
  const router = useRouter();
  const [filter, setFilter] = useState<DamageReportStatus | "alle">("alle");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const sel = useRowSelection(filtered);

  const bulkDelete = async () => {
    if (sel.count === 0) return;
    if (
      !confirm(
        `${sel.count} ${sel.count === 1 ? "Bericht" : "Berichte"} wirklich löschen? Zugehörige Fotos werden mitgelöscht.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/damage-reports/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: sel.selectedIds }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Löschen fehlgeschlagen");
      return;
    }
    sel.clear();
    router.refresh();
  };

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

      <BulkBar count={sel.count} onClear={sel.clear}>
        <Button variant="ghost" size="sm" onClick={bulkDelete} disabled={busy} className="text-red-700 hover:bg-red-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Löschen
        </Button>
      </BulkBar>

      {error && (
        <div className="mt-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
        </div>
      )}

      <div className="mt-4 panel overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[34px_110px_148px_1fr_180px_128px_24px] gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th items-center">
            <SelectCheckbox
              checked={sel.allSelected}
              indeterminate={sel.someSelected}
              onChange={sel.toggleAll}
              ariaLabel="Alle auswählen"
            />
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
              <div
                key={r.id}
                className="grid grid-cols-[34px_110px_148px_1fr_180px_128px_24px] gap-3 items-center px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
              >
                <SelectCheckbox
                  checked={sel.isSelected(r.id)}
                  onChange={() => sel.toggle(r.id)}
                  ariaLabel="Bericht auswählen"
                />
                <Link href={`/dashboard/damage-reports/${r.id}`} style={{ display: "contents" }}>
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
              </div>
            );
          })}
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-hairline">
          {filtered.map((r) => {
            const v = r.vehicle_id ? vehicleById.get(r.vehicle_id) : null;
            return (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3 hover:bg-canvas">
                <div className="pt-1">
                  <SelectCheckbox
                    checked={sel.isSelected(r.id)}
                    onChange={() => sel.toggle(r.id)}
                    ariaLabel="Bericht auswählen"
                  />
                </div>
                <Link
                  href={`/dashboard/damage-reports/${r.id}`}
                  className="flex items-start gap-3 flex-1 min-w-0 active:bg-canvas"
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
              </div>
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
