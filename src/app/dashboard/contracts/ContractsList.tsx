"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileSignature, Plus } from "lucide-react";
import { fmtDate } from "@/lib/utils";
import type { Contract, ContractStatus } from "@/lib/types";
import { Plate } from "@/components/ui/Plate";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterTabs, SearchInput } from "@/components/ui/Toolbar";
import { ButtonLink } from "@/components/ui/Button";

/* ── Contract-specific status pill (statuses differ from ticket pipeline) ── */
const CONTRACT_STATUS_META: Record<
  ContractStatus,
  { label: string; dot: string; soft: string; ink: string }
> = {
  aktiv:        { label: "Aktiv",         dot: "#059669", soft: "#E6F4EA", ink: "#166534" },
  abgeschlossen:{ label: "Abgeschlossen", dot: "#6B7280", soft: "#F3F4F6", ink: "#374151" },
  storniert:    { label: "Storniert",     dot: "#DC2626", soft: "#FEF2F2", ink: "#B91C1C" },
};

const ContractPill = ({ status }: { status: ContractStatus }) => {
  const m = CONTRACT_STATUS_META[status] ?? CONTRACT_STATUS_META.aktiv;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-0.5 text-[11px] font-mono font-medium tracking-tight"
      style={{ background: m.soft, color: m.ink }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
};

/* ── Filter config ── */
const FILTERS: { value: ContractStatus | "alle"; label: string }[] = [
  { value: "alle",          label: "Alle"          },
  { value: "aktiv",         label: "Aktiv"         },
  { value: "abgeschlossen", label: "Abgeschlossen" },
  { value: "storniert",     label: "Storniert"     },
];

export const ContractsList = ({ initial }: { initial: Contract[] }) => {
  const [filter, setFilter] = useState<ContractStatus | "alle">("alle");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return initial.filter((c) => {
      if (filter !== "alle" && c.status !== filter) return false;
      if (!needle) return true;
      return (
        c.contract_nr.toLowerCase().includes(needle) ||
        c.plate.toLowerCase().includes(needle) ||
        c.renter_name.toLowerCase().includes(needle) ||
        (c.renter_email || "").toLowerCase().includes(needle)
      );
    });
  }, [initial, filter, q]);

  const counts = (v: ContractStatus | "alle") =>
    v === "alle" ? initial.length : initial.filter((c) => c.status === v).length;

  return (
    <>
      <PageHeader
        kicker="Verträge"
        title="Mietverträge"
        description="Mietverträge sind die Grundlage für die automatische Strafzettel-Zuordnung."
        actions={
          <ButtonLink href="/dashboard/contracts/new" variant="signal" size="sm">
            <Plus size={14} /> Neuer Vertrag
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
          placeholder="Mieter, Kennzeichen, Vertrags-Nr…"
          className="w-72"
        />
      </div>

      <Panel flush className="mt-4 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[140px_128px_1fr_180px_130px_130px_24px] items-center gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th">
            <span>Vertrags-Nr</span>
            <span>Kennzeichen</span>
            <span>Mieter</span>
            <span>E-Mail</span>
            <span>Zeitraum</span>
            <span>Status</span>
            <span />
          </div>
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/contracts/${c.id}`}
              className="grid grid-cols-[140px_128px_1fr_180px_130px_130px_24px] items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
            >
              <span className="font-mono tnum text-[12px] text-ink-soft">{c.contract_nr}</span>
              <Plate value={c.plate} size="sm" />
              <span className="truncate text-ink">{c.renter_name}</span>
              <span className="text-[12.5px] text-ink-muted truncate">{c.renter_email || "—"}</span>
              <span className="font-mono tnum text-[12px] text-ink-soft">
                {fmtDate(c.pickup_date)}
                <br />
                <span className="text-ink-muted">→ {fmtDate(c.actual_return_date || c.return_date)}</span>
              </span>
              <ContractPill status={c.status} />
              <ChevronRight size={14} className="text-ink-muted" />
            </Link>
          ))}
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-hairline">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/contracts/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-canvas active:bg-canvas"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <ContractPill status={c.status} />
                  <Plate value={c.plate} size="sm" />
                  <span className="ml-auto font-mono text-[11px] text-ink-muted">{c.contract_nr}</span>
                </div>
                <div className="text-[13.5px] text-ink truncate">{c.renter_name}</div>
                <div className="font-mono tnum text-[11px] text-ink-muted">
                  {fmtDate(c.pickup_date)} → {fmtDate(c.actual_return_date || c.return_date)}
                </div>
              </div>
              <ChevronRight size={16} className="text-ink-muted shrink-0" />
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <EmptyState
            Icon={FileSignature}
            title="Keine Verträge in dieser Ansicht"
            description="Sobald ein Mietvertrag angelegt wird, erscheint er hier."
            action={
              <ButtonLink href="/dashboard/contracts/new" variant="signal" size="sm">
                <Plus size={14} /> Ersten Vertrag anlegen
              </ButtonLink>
            }
          />
        )}
      </Panel>
    </>
  );
};
