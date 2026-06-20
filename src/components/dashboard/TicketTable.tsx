"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, FileText, Loader2, Trash2 } from "lucide-react";
import { fmtEur, relTime } from "@/lib/utils";
import type { Ticket, TicketStatus } from "@/lib/types";
import { Plate } from "@/components/ui/Plate";
import { StatusPill, PIPELINE } from "@/components/ui/StatusPill";
import { FilterTabs } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  BulkBar,
  SelectCheckbox,
  useRowSelection,
} from "@/components/dashboard/bulk-select";

const FILTERS: { value: TicketStatus | "alle"; label: string }[] = [
  { value: "alle", label: "Alle" },
  ...PIPELINE.map((p) => ({ value: p.key, label: p.label })),
];

// `selectable` aktiviert Mehrfachauswahl + Bulk-Löschen (nur auf der
// Strafzettel-Seite, nicht in der Dashboard-Übersicht).
export const TicketTable = ({
  tickets,
  selectable = false,
}: {
  tickets: Ticket[];
  selectable?: boolean;
}) => {
  const router = useRouter();
  const [filter, setFilter] = useState<TicketStatus | "alle">("alle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filtered = tickets.filter((t) => (filter === "alle" ? true : t.status === filter));

  const sel = useRowSelection(filtered);

  const counts = (v: TicketStatus | "alle") =>
    v === "alle" ? tickets.length : tickets.filter((t) => t.status === v).length;

  const grid = selectable
    ? "grid-cols-[34px_130px_128px_1fr_150px_120px_96px_24px]"
    : "grid-cols-[130px_128px_1fr_150px_120px_96px_24px]";

  const bulkDelete = async () => {
    if (sel.count === 0) return;
    if (!confirm(`${sel.count} ${sel.count === 1 ? "Strafzettel" : "Strafzettel"} wirklich löschen?`))
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/tickets/bulk-delete", {
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

  return (
    <>
      {selectable && (
        <>
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
        </>
      )}

      <div className={`panel overflow-hidden ${selectable ? "mt-4" : ""}`}>
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 font-display font-bold text-[15px] tracking-tight text-ink">
            <FileText size={15} className="text-ink-muted" strokeWidth={1.9} />
            Strafzettel
          </div>
          <FilterTabs
            options={FILTERS.map((f) => ({ ...f, count: counts(f.value) }))}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            Icon={FileText}
            title="Keine Strafzettel in dieser Ansicht"
            description="Sobald ein Bescheid eingeht, erscheint er hier in der Strecke."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <div className={`grid ${grid} items-center gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th`}>
                {selectable && (
                  <SelectCheckbox
                    checked={sel.allSelected}
                    indeterminate={sel.someSelected}
                    onChange={sel.toggleAll}
                    ariaLabel="Alle auswählen"
                  />
                )}
                <span>Status</span>
                <span>Kennzeichen</span>
                <span>Verstoß</span>
                <span>Behörde</span>
                <span className="text-right">Betrag</span>
                <span className="text-right">Eingang</span>
                <span />
              </div>
              <div>
                {filtered.map((t) => (
                  <div
                    key={t.id}
                    className={`grid ${grid} items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors`}
                  >
                    {selectable && (
                      <SelectCheckbox
                        checked={sel.isSelected(t.id)}
                        onChange={() => sel.toggle(t.id)}
                        ariaLabel={`Strafzettel ${t.ticket_nr} auswählen`}
                      />
                    )}
                    <Link href={`/dashboard/tickets/${t.id}`} style={{ display: "contents" }}>
                      <StatusPill status={t.status} />
                      {t.plate ? (
                        <Plate value={t.plate} size="sm" />
                      ) : (
                        <span className="text-ink-muted font-mono">—</span>
                      )}
                      <span className="truncate text-ink">
                        {t.offense || t.ticket_nr}
                        {t.location && (
                          <span className="text-ink-muted ml-2 text-[12px]">· {t.location}</span>
                        )}
                      </span>
                      <span className="text-[12.5px] text-ink-muted truncate">{t.authority || "—"}</span>
                      <span className="font-mono tnum text-right text-ink">
                        {fmtEur((t.fine_amount || 0) + Number(t.processing_fee || 0))}
                      </span>
                      <span className="font-mono text-[12px] text-ink-muted text-right">
                        {relTime(t.created_at)}
                      </span>
                      <ChevronRight size={14} className="text-ink-muted" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-hairline">
              {filtered.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas">
                  {selectable && (
                    <SelectCheckbox
                      checked={sel.isSelected(t.id)}
                      onChange={() => sel.toggle(t.id)}
                      ariaLabel={`Strafzettel ${t.ticket_nr} auswählen`}
                    />
                  )}
                  <Link
                    href={`/dashboard/tickets/${t.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0 active:bg-canvas"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusPill status={t.status} />
                        {t.plate && <Plate value={t.plate} size="sm" />}
                        <span className="ml-auto font-mono tnum text-[13px] text-ink">
                          {fmtEur((t.fine_amount || 0) + Number(t.processing_fee || 0))}
                        </span>
                      </div>
                      <div className="text-[13.5px] text-ink truncate">{t.offense || t.ticket_nr}</div>
                      <div className="text-[11px] font-mono text-ink-muted flex items-center gap-2 flex-wrap">
                        {t.authority && <span className="truncate">{t.authority}</span>}
                        <span className="ml-auto">{relTime(t.created_at)}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-ink-muted shrink-0" />
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};
