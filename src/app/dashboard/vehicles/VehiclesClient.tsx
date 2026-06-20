"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Car, ChevronRight, FileSpreadsheet, Loader2, Plus, Trash2 } from "lucide-react";
import { CsvImportModal } from "@/components/dashboard/CsvImportModal";
import {
  BulkBar,
  SelectCheckbox,
  useRowSelection,
} from "@/components/dashboard/bulk-select";
import { fmtDate } from "@/lib/utils";
import { computeDecommission } from "@/lib/decommission";
import { VEHICLE_STATUS_META, buildVehicleType, isDecommissioned } from "@/lib/vehicle";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterTabs, SearchInput } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";

const FILTERS: Array<{ value: VehicleStatus | "alle"; label: string }> = [
  { value: "alle", label: "Alle" },
  { value: "aktiv", label: "Aktiv" },
  { value: "inaktiv", label: "Inaktiv" },
  { value: "werkstatt", label: "Werkstatt" },
  { value: "ausgesteuert", label: "Archiv" },
];

const VehicleStatusPill = ({ status }: { status: VehicleStatus }) => {
  const meta = VEHICLE_STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono font-medium tracking-tight"
      style={{ background: meta.bg, color: meta.text, boxShadow: `inset 0 0 0 1px ${meta.ring}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
};

export const VehiclesClient = ({ initial }: { initial: Vehicle[] }) => {
  const router = useRouter();
  const [filter, setFilter] = useState<VehicleStatus | "alle">("alle");
  const [q, setQ] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initial.filter((v) => {
      // Ausgeflottete Fahrzeuge (Status ODER erreichtes Ausflottungsdatum)
      // erscheinen ausschliesslich im Archiv-Tab.
      const archived = isDecommissioned(v);
      if (filter === "ausgesteuert") {
        if (!archived) return false;
      } else {
        if (archived) return false;
        if (filter !== "alle" && v.status !== filter) return false;
      }
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

  const sel = useRowSelection(filtered);

  const bulkDelete = async () => {
    if (sel.count === 0) return;
    if (!confirm(`${sel.count} ${sel.count === 1 ? "Fahrzeug" : "Fahrzeuge"} wirklich löschen?`))
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/vehicles/bulk-delete", {
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

  const counts = (v: VehicleStatus | "alle") => {
    if (v === "ausgesteuert") return initial.filter((x) => isDecommissioned(x)).length;
    const active = initial.filter((x) => !isDecommissioned(x));
    return v === "alle" ? active.length : active.filter((x) => x.status === v).length;
  };

  return (
    <>
      <PageHeader
        kicker="Flotte"
        title="Fahrzeuge"
        description="Stammdaten, Verfügbarkeit, Preise — alles in einem Datensatz pro Auto."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet size={14} /> CSV importieren
            </Button>
            <ButtonLink href="/dashboard/vehicles/new" variant="signal" size="sm">
              <Plus size={14} /> Neues Fahrzeug
            </ButtonLink>
          </>
        }
      />

      {importOpen && (
        <CsvImportModal
          title="Fahrzeuge aus CSV importieren"
          endpoint="/api/vehicles/import-csv"
          onClose={() => setImportOpen(false)}
        />
      )}

      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <FilterTabs
          options={FILTERS.map((f) => ({ ...f, count: counts(f.value) }))}
          value={filter}
          onChange={setFilter}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Kennzeichen, Modell, FIN…"
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
          <div className="grid grid-cols-[34px_132px_minmax(0,2fr)_minmax(0,1fr)_104px_124px_116px_44px] gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th items-center">
            <SelectCheckbox
              checked={sel.allSelected}
              indeterminate={sel.someSelected}
              onChange={sel.toggleAll}
              ariaLabel="Alle auswählen"
            />
            <span>Kennzeichen</span>
            <span>Hersteller / Modell</span>
            <span>Karosserie</span>
            <span className="text-right">Km-Stand</span>
            <span>Erstzulassung</span>
            <span>Status</span>
            <span />
          </div>
          {filtered.map((v) => {
            const decom = computeDecommission(v);
            const archived = isDecommissioned(v);
            const name = buildVehicleType(v.manufacturer, v.model) || v.vehicle_type || "—";
            return (
              <div
                key={v.id}
                className={`grid grid-cols-[34px_132px_minmax(0,2fr)_minmax(0,1fr)_104px_124px_116px_44px] gap-3 items-center px-5 py-3 border-b border-hairline last:border-0 hover:bg-canvas transition-colors text-[13.5px] ${
                  archived ? "opacity-75" : ""
                }`}
              >
                <SelectCheckbox
                  checked={sel.isSelected(v.id)}
                  onChange={() => sel.toggle(v.id)}
                  ariaLabel={`${v.plate} auswählen`}
                />
                <Link href={`/dashboard/vehicles/${v.id}`}>
                  <Plate value={v.plate} size="sm" />
                </Link>
                <Link href={`/dashboard/vehicles/${v.id}`} className="text-ink truncate">
                  {name}
                  {v.color && (
                    <span className="text-ink-muted text-[12px] ml-2">· {v.color}</span>
                  )}
                </Link>
                <Link href={`/dashboard/vehicles/${v.id}`} className="text-[12.5px] text-ink-muted truncate">
                  {v.body_type || "—"}
                  {v.category && (
                    <span className="text-ink-muted ml-1">· {v.category}</span>
                  )}
                </Link>
                <Link
                  href={`/dashboard/vehicles/${v.id}`}
                  className="font-mono tnum text-[12.5px] text-ink-muted text-right"
                >
                  {v.km_at_intake != null ? v.km_at_intake.toLocaleString("de-DE") : "—"}
                </Link>
                <Link
                  href={`/dashboard/vehicles/${v.id}`}
                  className="font-mono tnum text-[12.5px] text-ink-muted"
                >
                  {v.first_registration ? fmtDate(v.first_registration) : "—"}
                  {archived
                    ? v.decommission_date && (
                        <div className="text-[10px] text-ink-muted">
                          Ausgeflottet zum {fmtDate(v.decommission_date)}
                        </div>
                      )
                    : v.decommission_date && (
                        <div className="text-[10px]" style={{ color: decom.textColor }}>
                          {decom.label}
                        </div>
                      )}
                </Link>
                <VehicleStatusPill status={v.status} />
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/dashboard/vehicles/${v.id}`}
                    className="text-ink-muted hover:text-ink p-1.5"
                    title="Detail"
                  >
                    <ChevronRight size={14} />
                  </Link>
                  <button
                    onClick={() => remove(v.id)}
                    className="text-ink-muted hover:text-red-600 p-1.5"
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
        <div className="md:hidden divide-y divide-hairline">
          {filtered.map((v) => {
            const archived = isDecommissioned(v);
            const name = buildVehicleType(v.manufacturer, v.model) || v.vehicle_type || "—";
            return (
              <div
                key={v.id}
                className={`flex items-start gap-3 px-4 py-3 ${archived ? "opacity-75" : ""}`}
              >
                <div className="pt-1">
                  <SelectCheckbox
                    checked={sel.isSelected(v.id)}
                    onChange={() => sel.toggle(v.id)}
                    ariaLabel={`${v.plate} auswählen`}
                  />
                </div>
                <Link
                  href={`/dashboard/vehicles/${v.id}`}
                  className="flex-1 min-w-0 flex items-start gap-3 active:bg-canvas -mx-4 -my-3 px-4 py-3"
                >
                  <div className="w-9 h-9 rounded-panel border border-hairline bg-canvas text-ink-muted flex items-center justify-center shrink-0">
                    <Car size={16} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Plate value={v.plate} size="sm" />
                      <VehicleStatusPill status={v.status} />
                    </div>
                    <div className="text-[13px] text-ink truncate">{name}</div>
                    <div className="text-[11px] font-mono text-ink-muted truncate">
                      {[v.body_type, v.color, v.first_registration && fmtDate(v.first_registration)]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                    {archived && v.decommission_date && (
                      <div className="text-[11px] text-ink-muted">
                        Ausgeflottet zum {fmtDate(v.decommission_date)}
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => remove(v.id)}
                  className="touch-target flex items-center justify-center text-ink-muted hover:text-red-600"
                  title="Löschen"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            Icon={Car}
            title={q ? "Keine Fahrzeuge gefunden." : "Noch keine Fahrzeuge."}
            description={q ? undefined : "Legen Sie das erste Fahrzeug an, um die Flotte aufzubauen."}
            action={
              !q ? (
                <ButtonLink href="/dashboard/vehicles/new" variant="signal" size="sm">
                  <Plus size={14} /> Erstes Fahrzeug anlegen
                </ButtonLink>
              ) : undefined
            }
          />
        )}
      </div>
    </>
  );
};
