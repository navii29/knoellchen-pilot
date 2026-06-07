"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Download,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { fmtEur } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Plate } from "@/components/ui/Plate";
import {
  UTIL_META,
  lastNDaysIso,
  marginColor,
  utilizationLevel,
  type FleetMargin,
} from "@/lib/margin";

type Response = {
  ok: boolean;
  period: { from: string; to: string };
  margin: FleetMargin;
  previous: {
    from: string;
    to: string;
    total_margin: number;
    total_ist_vk: number;
    avg_utilization_pct: number;
  } | null;
  error?: string;
};

const presets = [
  { label: "7 Tage", days: 7 },
  { label: "30 Tage", days: 30 },
  { label: "90 Tage", days: 90 },
];

export const MarginClient = () => {
  const initial = lastNDaysIso(7);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (f: string, t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports/margin?from=${f}&to=${t}&compare=true`
      );
      const j = (await res.json().catch(() => ({}))) as Response;
      if (!res.ok || !j.ok) {
        setError(j.error ?? "Laden fehlgeschlagen");
        setData(null);
        return;
      }
      setData(j);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPreset = (days: number) => {
    const p = lastNDaysIso(days);
    setFrom(p.from);
    setTo(p.to);
    void load(p.from, p.to);
  };

  const m = data?.margin;
  const prev = data?.previous;
  const marginDelta =
    m && prev ? m.total_margin - prev.total_margin : null;
  const marginDeltaPct =
    m && prev && Math.abs(prev.total_margin) > 0.01
      ? ((m.total_margin - prev.total_margin) / Math.abs(prev.total_margin)) * 100
      : null;

  return (
    <>
      <Link
        href="/dashboard/reports"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted hover:text-ink mb-4"
      >
        <ArrowLeft size={14} /> Zurück zur Auswertung
      </Link>

      <PageHeader
        kicker="Reports · Fahrzeugmarge"
        title="Margenrechnung"
        description="Welche Fahrzeuge verdienen Geld, welche nicht? EK-Kosten laufen jeden Tag — auch wenn das Auto steht."
        actions={
          <a
            href={`/api/reports/margin/pdf?from=${from}&to=${to}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-btn bg-ink text-white hover:bg-ink-soft transition-colors"
          >
            <Download size={13} /> Als PDF
          </a>
        }
        className="mb-6"
      />

      {/* Period Selector */}
      <Panel>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setPreset(p.days)}
              className="text-[12.5px] px-3 h-8 rounded-btn border border-hairline bg-canvas text-ink-soft font-medium hover:bg-ink/5 hover:text-ink transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="block">
            <div className="data-label mb-1 inline-flex items-center gap-1.5">
              <Calendar size={11} /> Von
            </div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="field"
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
              className="field"
            />
          </label>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => load(from, to)}
            disabled={loading}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            Aktualisieren
          </Button>
        </div>
      </Panel>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-[13px] rounded-panel px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Summary cards */}
      {m && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            label="Ist-VK gesamt"
            value={fmtEur(m.total_ist_vk)}
          />
          <SummaryCard label="EK gesamt" value={fmtEur(m.total_ek)} muted />
          <SummaryCard
            label="Marge"
            value={fmtEur(m.total_margin)}
            highlight={m.total_margin >= 0 ? "good" : "bad"}
            delta={
              marginDeltaPct != null
                ? `${marginDeltaPct >= 0 ? "+" : ""}${marginDeltaPct.toFixed(0)}% vs. Vorperiode`
                : undefined
            }
            deltaDirection={marginDelta != null ? (marginDelta >= 0 ? "up" : "down") : undefined}
          />
          <SummaryCard
            label="Auslastung"
            value={`${m.avg_utilization_pct.toFixed(0)}%`}
            highlight={
              m.avg_utilization_pct >= 70
                ? "good"
                : m.avg_utilization_pct >= 40
                ? "warn"
                : "bad"
            }
          />
        </div>
      )}

      {/* Per-vehicle table */}
      {m && (
        <div className="mt-6 panel overflow-hidden">
          {m.vehicles.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-ink-muted">
              Keine Fahrzeuge in der Flotte.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[128px_1fr_70px_90px_90px_90px_100px_70px] items-center gap-3 px-5 py-2.5 bg-canvas/60 border-b border-hairline th">
                <span>Kennzeichen</span>
                <span>Fahrzeug</span>
                <span className="text-right">Tage</span>
                <span className="text-right">EK</span>
                <span className="text-right">Soll-VK</span>
                <span className="text-right">Ist-VK</span>
                <span className="text-right">Marge</span>
                <span className="text-right">Auslastung</span>
              </div>
              {m.vehicles.map((v) => {
                const mc = marginColor(v.margin_eur);
                const util = utilizationLevel(v.utilization_pct);
                const utilMeta = UTIL_META[util];
                return (
                  <Link
                    key={v.vehicle_id}
                    href={`/dashboard/vehicles/${v.vehicle_id}`}
                    className="grid grid-cols-[128px_1fr_70px_90px_90px_90px_100px_70px] items-center gap-3 px-5 py-2.5 hover:bg-canvas border-b border-hairline last:border-0 transition-colors"
                  >
                    <Plate value={v.plate} size="sm" />
                    <span className="text-[13px] text-ink-soft truncate">
                      {v.label}
                    </span>
                    <span className="font-mono tnum text-[13px] text-right text-ink-soft">
                      {v.rented_days}/{v.period_days}
                    </span>
                    <span className="font-mono tnum text-[13px] text-right text-ink-muted">
                      {fmtEur(v.ek_total)}
                    </span>
                    <span className="font-mono tnum text-[13px] text-right text-ink-muted">
                      {v.target_daily_rate != null ? fmtEur(v.soll_vk_total) : "—"}
                    </span>
                    <span className="font-mono tnum text-[13px] text-right text-ink font-medium">
                      {fmtEur(v.ist_vk_total)}
                    </span>
                    <span
                      className="font-mono tnum text-[13px] text-right font-semibold"
                      style={{ color: mc.text }}
                    >
                      {fmtEur(v.margin_eur)}
                      {v.margin_pct != null && (
                        <span className="text-[10px] block opacity-70">
                          {v.margin_pct.toFixed(0)}%
                        </span>
                      )}
                    </span>
                    <span
                      className="font-mono tnum text-[12px] text-right font-semibold inline-flex items-center justify-end gap-1"
                      style={{ color: utilMeta.text }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: utilMeta.color }}
                      />
                      {v.utilization_pct.toFixed(0)}%
                    </span>
                  </Link>
                );
              })}
              {/* Totals row */}
              <div className="grid grid-cols-[128px_1fr_70px_90px_90px_90px_100px_70px] items-center gap-3 px-5 py-3 bg-canvas/60 border-t border-hairline text-[12.5px] font-medium">
                <span className="kicker text-ink-muted">Summe</span>
                <span></span>
                <span className="font-mono tnum text-right text-ink-soft">
                  {m.total_rented_days}/{m.total_possible_days}
                </span>
                <span className="font-mono tnum text-right text-ink-soft">
                  {fmtEur(m.total_ek)}
                </span>
                <span className="font-mono tnum text-right text-ink-soft">
                  {fmtEur(m.total_soll_vk)}
                </span>
                <span className="font-mono tnum text-right text-ink">
                  {fmtEur(m.total_ist_vk)}
                </span>
                <span
                  className="font-mono tnum text-right font-bold"
                  style={{ color: marginColor(m.total_margin).text }}
                >
                  {fmtEur(m.total_margin)}
                </span>
                <span className="font-mono tnum text-right text-ink-soft">
                  {m.avg_utilization_pct.toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

const SummaryCard = ({
  label,
  value,
  highlight,
  muted,
  delta,
  deltaDirection,
}: {
  label: string;
  value: string;
  highlight?: "good" | "warn" | "bad";
  muted?: boolean;
  delta?: string;
  deltaDirection?: "up" | "down";
}) => {
  const bg =
    highlight === "good"
      ? "bg-emerald-50 border-emerald-200"
      : highlight === "warn"
      ? "bg-amber-50 border-amber-200"
      : highlight === "bad"
      ? "bg-rose-50 border-rose-200"
      : "bg-paper border-hairline";
  const valColor =
    highlight === "good"
      ? "text-emerald-700"
      : highlight === "warn"
      ? "text-amber-700"
      : highlight === "bad"
      ? "text-rose-700"
      : "text-ink";
  return (
    <div className={`rounded-card border p-4 shadow-panel ${bg}`}>
      <div className={`data-label ${muted ? "text-ink-muted" : "text-ink-soft"}`}>
        {label}
      </div>
      <div
        className={`font-display text-[24px] sm:text-[28px] tracking-tightest font-extrabold leading-tight font-mono tnum mt-1 ${valColor}`}
      >
        {value}
      </div>
      {delta && (
        <div
          className={`mt-1 text-[11.5px] font-mono tnum inline-flex items-center gap-1 font-medium ${
            deltaDirection === "up"
              ? "text-emerald-700"
              : deltaDirection === "down"
              ? "text-rose-700"
              : "text-ink-muted"
          }`}
        >
          {deltaDirection === "up" ? (
            <TrendingUp size={11} />
          ) : deltaDirection === "down" ? (
            <TrendingDown size={11} />
          ) : null}
          {delta}
        </div>
      )}
    </div>
  );
};
