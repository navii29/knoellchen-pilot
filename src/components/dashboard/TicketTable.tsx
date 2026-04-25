"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { fmtEur, relTime } from "@/lib/utils";
import { STATUS_META } from "@/lib/theme";
import type { Ticket, TicketStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

const FILTERS: Array<TicketStatus | "alle"> = [
  "alle",
  "neu",
  "zugeordnet",
  "weiterbelastet",
  "bezahlt",
];

export const TicketTable = ({ tickets }: { tickets: Ticket[] }) => {
  const [filter, setFilter] = useState<TicketStatus | "alle">("alle");
  const filtered = tickets.filter((t) => (filter === "alle" ? true : t.status === filter));

  return (
    <div className="rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-4 md:px-5 py-3.5 border-b border-stone-100 flex items-center justify-between flex-wrap gap-2">
        <div className="font-display font-semibold">Strafzettel</div>
        <div className="flex items-center gap-1 text-xs flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1.5 rounded-md ${
                filter === f ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {f === "alle" ? "Alle" : STATUS_META[f].label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="px-5 py-12 text-center text-sm text-stone-500">
          Noch keine Strafzettel in dieser Ansicht.
        </div>
      )}

      {/* Desktop: Tabelle */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[110px_110px_1fr_140px_120px_110px_24px] items-center gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
          <span>Status</span>
          <span>Kennzeichen</span>
          <span>Verstoß</span>
          <span>Behörde</span>
          <span className="text-right">Betrag</span>
          <span className="text-right">Eingang</span>
          <span></span>
        </div>
        <div>
          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/tickets/${t.id}`}
              className="w-full grid grid-cols-[110px_110px_1fr_140px_120px_110px_24px] items-center gap-3 px-5 py-3 border-b border-stone-50 last:border-0 text-sm text-left hover:bg-stone-50"
            >
              <StatusBadge status={t.status} />
              <span className="font-mono font-semibold tracking-tight">{t.plate || "—"}</span>
              <span className="truncate">
                <span className="text-stone-900">{t.offense || t.ticket_nr}</span>
                {t.location && <span className="text-stone-400 ml-2 text-xs">· {t.location}</span>}
              </span>
              <span className="text-xs text-stone-500 truncate">{t.authority || "—"}</span>
              <span className="tabular-nums text-right">
                {fmtEur((t.fine_amount || 0) + Number(t.processing_fee || 0))}
              </span>
              <span className="text-xs text-stone-400 text-right">{relTime(t.created_at)}</span>
              <ChevronRight size={14} className="text-stone-300" />
            </Link>
          ))}
        </div>
      </div>

      {/* Mobile: Card-Liste */}
      <div className="md:hidden divide-y divide-stone-100">
        {filtered.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/tickets/${t.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 active:bg-stone-100"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={t.status} />
                <span className="font-mono font-semibold text-sm tracking-tight">
                  {t.plate || "—"}
                </span>
                <span className="ml-auto tabular-nums text-sm">
                  {fmtEur((t.fine_amount || 0) + Number(t.processing_fee || 0))}
                </span>
              </div>
              <div className="text-sm text-stone-900 truncate">{t.offense || t.ticket_nr}</div>
              <div className="text-[11px] text-stone-400 flex items-center gap-2 flex-wrap">
                {t.authority && <span className="truncate">{t.authority}</span>}
                <span className="ml-auto">{relTime(t.created_at)}</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-stone-300 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
};
