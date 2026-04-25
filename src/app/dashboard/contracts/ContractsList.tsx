"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileSignature, Plus, Search } from "lucide-react";
import { THEME } from "@/lib/theme";
import { fmtDate } from "@/lib/utils";
import type { Contract, ContractStatus } from "@/lib/types";
import { ContractStatusBadge } from "@/components/contract/StatusBadge";

const FILTERS: Array<ContractStatus | "alle"> = ["alle", "aktiv", "abgeschlossen", "storniert"];
const FILTER_LABELS: Record<string, string> = {
  alle: "Alle",
  aktiv: "Aktiv",
  abgeschlossen: "Abgeschlossen",
  storniert: "Storniert",
};

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

  return (
    <>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="font-display font-bold text-2xl tracking-tight">Verträge</div>
          <p className="text-sm text-stone-500 mt-1">
            Mietverträge sind die Grundlage für die automatische Strafzettel-Zuordnung.
          </p>
        </div>
        <Link
          href="/dashboard/contracts/new"
          className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium"
          style={{ background: THEME.primary }}
        >
          <Plus size={14} /> Neuer Vertrag
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
            placeholder="Mieter, Kennzeichen, Vertrags-Nr…"
            className="pl-8 pr-3 py-2 bg-white rounded-md text-sm ring-1 ring-stone-200 w-72 outline-none focus:ring-stone-400"
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
        {/* Desktop-Tabelle */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[140px_110px_1fr_180px_120px_120px_24px] gap-3 px-5 py-2.5 text-[11px] uppercase tracking-wider text-stone-400 border-b border-stone-100">
            <span>Vertrags-Nr</span>
            <span>Kennzeichen</span>
            <span>Mieter</span>
            <span>E-Mail</span>
            <span>Zeitraum</span>
            <span>Status</span>
            <span></span>
          </div>
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/contracts/${c.id}`}
              className="grid grid-cols-[140px_110px_1fr_180px_120px_120px_24px] gap-3 items-center px-5 py-3 border-b border-stone-50 last:border-0 text-sm hover:bg-stone-50"
            >
              <span className="font-mono text-xs">{c.contract_nr}</span>
              <span className="font-mono font-semibold">{c.plate}</span>
              <span className="text-stone-900 truncate">{c.renter_name}</span>
              <span className="text-stone-500 text-xs truncate">{c.renter_email || "—"}</span>
              <span className="text-stone-700 tabular-nums text-xs">
                {fmtDate(c.pickup_date)}
                <br />
                <span className="text-stone-400">→ {fmtDate(c.actual_return_date || c.return_date)}</span>
              </span>
              <ContractStatusBadge status={c.status} />
              <ChevronRight size={14} className="text-stone-300" />
            </Link>
          ))}
        </div>

        {/* Mobile-Cards */}
        <div className="md:hidden divide-y divide-stone-100">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/contracts/${c.id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 active:bg-stone-100"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <ContractStatusBadge status={c.status} />
                  <span className="font-mono font-semibold text-sm">{c.plate}</span>
                  <span className="ml-auto font-mono text-[11px] text-stone-500">{c.contract_nr}</span>
                </div>
                <div className="text-sm text-stone-900 truncate">{c.renter_name}</div>
                <div className="text-[11px] text-stone-500 tabular-nums">
                  {fmtDate(c.pickup_date)} → {fmtDate(c.actual_return_date || c.return_date)}
                </div>
              </div>
              <ChevronRight size={16} className="text-stone-300 shrink-0 mt-1" />
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-stone-500">
            <FileSignature size={28} className="mx-auto text-stone-300" />
            <div className="mt-3">Keine Verträge in dieser Ansicht.</div>
            <Link
              href="/dashboard/contracts/new"
              className="inline-flex items-center gap-1.5 text-sm text-white px-3.5 py-1.5 rounded-md font-medium mt-4"
              style={{ background: THEME.primary }}
            >
              <Plus size={14} /> Ersten Vertrag anlegen
            </Link>
          </div>
        )}
      </div>
    </>
  );
};
