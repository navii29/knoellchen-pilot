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
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";
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
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-5"
      >
        <ArrowLeft size={14} /> Zurück zum Partner
      </Link>

      <PageHeader
        kicker="Provisionsabrechnung"
        title={partner.name}
        description="Zeitraumbasierte Provisionsübersicht — als PDF exportierbar."
      />

      {/* Period selector */}
      <Panel className="mt-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button type="button" variant="ghost" size="sm" onClick={() => setMonth(0)}>
            Diesen Monat
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setMonth(-1)}>
            Letzten Monat
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const y = new Date().getFullYear();
              const f = `${y}-01-01`;
              const t = `${y}-12-31`;
              setFrom(f);
              setTo(t);
              void load(f, t);
            }}
          >
            Dieses Jahr
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="data-label mb-1 inline-flex items-center gap-1.5">
              <Calendar size={11} /> Von
            </div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="field font-mono tnum"
            />
          </label>
          <label className="block">
            <div className="data-label mb-1 inline-flex items-center gap-1.5">
              <Calendar size={11} /> Bis
            </div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="field font-mono tnum"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load(from, to)}
            disabled={loading}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            Aktualisieren
          </Button>
          <a
            href={`/api/partners/${partner.id}/invoice/pdf?from=${from}&to=${to}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-8 px-3 rounded-btn bg-ink text-white text-[13px] font-medium tracking-tight hover:bg-ink-soft transition-all duration-150"
          >
            <Download size={13} /> PDF generieren
          </a>
        </div>
      </Panel>

      {error && (
        <div className="mt-4 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-panel px-3 py-2">
          {error}
        </div>
      )}

      {/* Items table */}
      <Panel flush className="mt-6">
        <PanelHeader Icon={Receipt} title="Positionen" />
        {items.length === 0 && !loading ? (
          <EmptyState
            Icon={Receipt}
            title="Keine Verträge im gewählten Zeitraum."
          />
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[120px_1fr_140px_140px_60px_100px_100px] items-center gap-3 px-5 py-2.5 border-b border-hairline bg-canvas/60 th">
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
                className="grid grid-cols-[120px_1fr_140px_140px_60px_100px_100px] items-center gap-3 px-5 py-2.5 border-b border-hairline last:border-0 hover:bg-canvas transition-colors"
              >
                <span className="font-mono text-[12px] text-ink-muted tnum">
                  {it.contract_nr}
                </span>
                <span className="text-[13.5px] text-ink truncate">
                  {it.renter_name}
                </span>
                {it.plate ? (
                  <Plate value={it.plate} size="sm" />
                ) : (
                  <span className="font-mono text-ink-muted">—</span>
                )}
                <span className="text-[12px] text-ink-muted font-mono tnum">
                  {fmtDate(it.pickup_date)} – {fmtDate(it.return_date)}
                </span>
                <span className="text-[12px] text-ink-muted text-right font-mono tnum">
                  {it.days}
                </span>
                <span className="text-[12px] text-ink-muted text-right font-mono tnum">
                  {it.purchase_price_per_day != null
                    ? fmtEur(it.purchase_price_per_day)
                    : "—"}
                </span>
                <span className="text-[13px] text-ink font-semibold text-right font-mono tnum">
                  {fmtEur(it.computed_commission)}
                </span>
              </Link>
            ))}
            {totals && items.length > 0 && (
              <div className="grid grid-cols-[120px_1fr_140px_140px_60px_100px_100px] items-center gap-3 px-5 py-3 border-t border-hairline bg-canvas/60 text-[12.5px] font-medium">
                <span />
                <span />
                <span />
                <span className="data-label text-right">Summe</span>
                <span className="text-right font-mono tnum text-ink">
                  {totals.total_days}
                </span>
                <span className="text-right font-mono tnum text-ink-soft">
                  {fmtEur(totals.total_purchase)}
                </span>
                <span className="text-right font-mono tnum text-ink font-bold">
                  {fmtEur(totals.total_commission)}
                </span>
              </div>
            )}
          </>
        )}
      </Panel>
    </>
  );
};
