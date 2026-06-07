"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { fmtEur, relTime } from "@/lib/utils";
import type { Ticket, TicketStatus } from "@/lib/types";
import { Plate } from "@/components/ui/Plate";
import { StatusPill, PIPELINE } from "@/components/ui/StatusPill";
import { FilterTabs } from "@/components/ui/Toolbar";
import { EmptyState } from "@/components/ui/EmptyState";

const FILTERS: { value: TicketStatus | "alle"; label: string }[] = [
  { value: "alle", label: "Alle" },
  ...PIPELINE.map((p) => ({ value: p.key, label: p.label })),
];

export const TicketTable = ({ tickets }: { tickets: Ticket[] }) => {
  const [filter, setFilter] = useState<TicketStatus | "alle">("alle");
  const filtered = tickets.filter((t) => (filter === "alle" ? true : t.status === filter));

  const counts = (v: TicketStatus | "alle") =>
    v === "alle" ? tickets.length : tickets.filter((t) => t.status === v).length;

  return (
    <div className="panel overflow-hidden">
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
            <div className="grid grid-cols-[130px_128px_1fr_150px_120px_96px_24px] items-center gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th">
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
                <Link
                  key={t.id}
                  href={`/dashboard/tickets/${t.id}`}
                  className="grid grid-cols-[130px_128px_1fr_150px_120px_96px_24px] items-center gap-3 px-5 py-3 border-b border-hairline last:border-0 text-[13.5px] hover:bg-canvas transition-colors"
                >
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
              ))}
            </div>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-hairline">
            {filtered.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tickets/${t.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-canvas active:bg-canvas"
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
            ))}
          </div>
        </>
      )}
    </div>
  );
};
