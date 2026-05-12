"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Loader2,
  Receipt,
} from "lucide-react";
import { fmtDate, fmtEur } from "@/lib/utils";
import type { SalesPartner } from "@/lib/partners";

type Item = {
  contract_id: string;
  contract_nr: string;
  plate: string;
  vehicle_type: string | null;
  renter_name: string;
  pickup_date: string;
  return_date: string;
  days: number;
  purchase_price_per_day: number | null;
  selling_price_per_day: number | null;
  computed_commission: number;
};

type Totals = {
  contract_count: number;
  total_days: number;
  total_purchase: number;
  total_selling: number;
  total_commission: number;
};

const monthInputValue = (offset: number): { from: string; to: string } => {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const from = new Date(target.getFullYear(), target.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const to = new Date(target.getFullYear(), target.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
  return { from, to };
};

export const InvoiceClient = ({ partner }: { partner: SalesPartner }) => {
  const initial = monthInputValue(0);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/partners/${partner.id}/invoice?from=${f}&to=${t}`;
      const res = await fetch(url);
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        items?: Item[];
        totals?: Totals;
        error?: string;
      };
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Laden fehlgeschlagen");
        setItems([]);
        setTotals(null);
        return;
      }
      setItems(j.items ?? []);
      setTotals(j.totals ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMonth = (offset: number) => {
    const m = monthInputValue(offset);
    setFrom(m.from);
    setTo(m.to);
    void load(m.from, m.to);
  };

  return (
    <>
      <Link
        href={`/dashboard/partners/${partner.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 mb-4"
      >
        <ArrowLeft size={14} /> Zurück zum Partner
      </Link>

      <div className="font-display font-bold text-2xl tracking-tight">
        Provisionsabrechnung
      </div>
      <p className="text-sm text-stone-500 mt-1">
        Partner: <span className="font-medium text-stone-700">{partner.name}</span>
      </p>

      {/* Period selector */}
      <div className="mt-6 rounded-xl bg-white ring-1 ring-stone-200 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setMonth(0)}
            className="text-[12.5px] px-3 h-8 rounded-full bg-stone-100 text-stone-700 font-medium hover:bg-stone-200"
          >
            Diesen Monat
          </button>
          <button
            type="button"
            onClick={() => setMonth(-1)}
            className="text-[12.5px] px-3 h-8 rounded-full bg-stone-100 text-stone-700 font-medium hover:bg-stone-200"
          >
            Letzten Monat
          </button>
          <button
            type="button"
            onClick={() => {
              const y = new Date().getFullYear();
              const f = `${y}-01-01`;
              const t = `${y}-12-31`;
              setFrom(f);
              setTo(t);
              void load(f, t);
            }}
            className="text-[12.5px] px-3 h-8 rounded-full bg-stone-100 text-stone-700 font-medium hover:bg-stone-200"
          >
            Dieses Jahr
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-[11.5px] uppercase tracking-wider text-stone-500 font-medium mb-1 inline-flex items-center gap-1.5">
              <Calendar size={11} /> Von
            </div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white ring-1 ring-stone-200 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </label>
          <label className="block">
            <div className="text-[11.5px] uppercase tracking-wider text-stone-500 font-medium mb-1 inline-flex items-center gap-1.5">
              <Calendar size={11} /> Bis
            </div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white ring-1 ring-stone-200 text-sm outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => load(from, to)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            Aktualisieren
          </button>
          <a
            href={`/api/partners/${partner.id}/invoice/pdf?from=${from}&to=${to}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-stone-900 text-white font-medium hover:bg-stone-800"
          >
            <Download size={13} /> PDF generieren
          </a>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Items table */}
      <div className="mt-6 rounded-xl bg-white ring-1 ring-stone-200 overflow-hidden">
        {items.length === 0 && !loading ? (
          <div className="px-5 py-12 text-center text-sm text-stone-500">
            <Receipt size={24} className="mx-auto text-stone-300 mb-2" />
            Keine Verträge im gewählten Zeitraum.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[120px_1fr_140px_140px_60px_100px_100px] items-center gap-3 px-5 py-2.5 bg-stone-50 border-b border-stone-100 text-[10.5px] uppercase tracking-wider text-stone-500 font-semibold">
              <span>Vertrag</span>
              <span>Mieter</span>
              <span>Kennzeichen</span>
              <span>Zeitraum</span>
              <span className="text-right">Tage</span>
              <span className="text-right">Einst./Tag</span>
              <span className="text-right">Provision</span>
            </div>
            {items.map((it) => (
              <Link
                key={it.contract_id}
                href={`/dashboard/contracts/${it.contract_id}`}
                className="grid grid-cols-[120px_1fr_140px_140px_60px_100px_100px] items-center gap-3 px-5 py-2.5 border-b border-stone-100 last:border-0 hover:bg-stone-50"
              >
                <span className="font-mono text-xs text-stone-700">
                  {it.contract_nr}
                </span>
                <span className="text-sm text-stone-700 truncate">
                  {it.renter_name}
                </span>
                <span className="font-mono text-xs text-stone-500">
                  {it.plate}
                </span>
                <span className="text-xs text-stone-500 tabular-nums">
                  {fmtDate(it.pickup_date)} – {fmtDate(it.return_date)}
                </span>
                <span className="text-xs text-stone-500 text-right tabular-nums">
                  {it.days}
                </span>
                <span className="text-xs text-stone-500 text-right tabular-nums">
                  {it.purchase_price_per_day != null
                    ? fmtEur(it.purchase_price_per_day)
                    : "—"}
                </span>
                <span className="text-sm text-emerald-700 font-semibold text-right tabular-nums">
                  {fmtEur(it.computed_commission)}
                </span>
              </Link>
            ))}
            {totals && items.length > 0 && (
              <div className="grid grid-cols-[120px_1fr_140px_140px_60px_100px_100px] items-center gap-3 px-5 py-3 bg-stone-50 border-t border-stone-200 text-[12.5px] font-medium">
                <span></span>
                <span></span>
                <span></span>
                <span className="text-stone-500 text-right uppercase tracking-wider text-[10.5px]">
                  Summe
                </span>
                <span className="text-right tabular-nums text-stone-700">
                  {totals.total_days}
                </span>
                <span className="text-right tabular-nums text-stone-700">
                  {fmtEur(totals.total_purchase)}
                </span>
                <span className="text-right tabular-nums text-emerald-700 font-bold">
                  {fmtEur(totals.total_commission)}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
