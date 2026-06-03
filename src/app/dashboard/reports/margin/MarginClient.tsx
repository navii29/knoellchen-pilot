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
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-4"
      >
        <ArrowLeft size={14} /> Zurück zur Auswertung
      </Link>

      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="font-display font-bold text-2xl tracking-tight">
            Margenrechnung
          </div>
          <p className="text-sm text-zinc-500 mt-1 max-w-xl">
            Welche Fahrzeuge verdienen Geld, welche nicht? EK-Kosten laufen
            jeden Tag — auch wenn das Auto steht.
          </p>
        </div>
        <a
          href={`/api/reports/margin/pdf?from=${from}&to=${to}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-zinc-900 text-white font-medium hover:bg-zinc-800"
        >
          <Download size={13} /> Als PDF
        </a>
      </div>

      {/* Period Selector */}
      <div className="mt-6 rounded-xl bg-white ring-1 ring-zinc-200 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setPreset(p.days)}
              className="text-[12.5px] px-3 h-8 rounded-full bg-zinc-100 text-zinc-700 font-medium hover:bg-zinc-200"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <label className="block">
            <div className="text-[11.5px] uppercase tracking-wider text-zinc-500 font-medium mb-1 inline-flex items-center gap-1.5">
              <Calendar size={11} /> Von
            </div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white ring-1 ring-zinc-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </label>
          <label className="block">
            <div className="text-[11.5px] uppercase tracking-wider text-zinc-500 font-medium mb-1 inline-flex items-center gap-1.5">
              <Calendar size={11} /> Bis
            </div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white ring-1 ring-zinc-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </label>
          <button
            type="button"
            onClick={() => load(from, to)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm px-3 h-10 rounded-lg ring-1 ring-zinc-200 hover:bg-zinc-50 disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : null}
            Aktualisieren
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm rounded-lg px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700">
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
        <div className="mt-6 rounded-xl bg-white ring-1 ring-zinc-200 overflow-hidden">
          {m.vehicles.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-500">
              Keine Fahrzeuge in der Flotte.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[110px_1fr_70px_90px_90px_90px_100px_70px] items-center gap-3 px-5 py-2.5 bg-zinc-50 border-b border-zinc-100 text-[10.5px] uppercase tracking-wider text-zinc-500 font-semibold">
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
                    className="grid grid-cols-[110px_1fr_70px_90px_90px_90px_100px_70px] items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 border-b border-zinc-100 last:border-0"
                  >
                    <span className="font-mono text-sm font-semibold text-zinc-900">
                      {v.plate}
                    </span>
                    <span className="text-sm text-zinc-700 truncate">
                      {v.label}
                    </span>
                    <span className="text-sm tabular-nums text-right text-zinc-700">
                      {v.rented_days}/{v.period_days}
                    </span>
                    <span className="text-sm tabular-nums text-right text-zinc-500">
                      {fmtEur(v.ek_total)}
                    </span>
                    <span className="text-sm tabular-nums text-right text-zinc-500">
                      {v.target_daily_rate != null ? fmtEur(v.soll_vk_total) : "—"}
                    </span>
                    <span className="text-sm tabular-nums text-right text-zinc-900 font-medium">
                      {fmtEur(v.ist_vk_total)}
                    </span>
                    <span
                      className="text-sm tabular-nums text-right font-semibold"
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
                      className="text-xs tabular-nums text-right font-semibold inline-flex items-center justify-end gap-1"
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
              <div className="grid grid-cols-[110px_1fr_70px_90px_90px_90px_100px_70px] items-center gap-3 px-5 py-3 bg-zinc-50 border-t border-zinc-200 text-[12.5px] font-medium">
                <span className="text-zinc-500 uppercase tracking-wider text-[10.5px]">
                  Summe
                </span>
                <span></span>
                <span className="text-right tabular-nums text-zinc-700">
                  {m.total_rented_days}/{m.total_possible_days}
                </span>
                <span className="text-right tabular-nums text-zinc-700">
                  {fmtEur(m.total_ek)}
                </span>
                <span className="text-right tabular-nums text-zinc-700">
                  {fmtEur(m.total_soll_vk)}
                </span>
                <span className="text-right tabular-nums text-zinc-900">
                  {fmtEur(m.total_ist_vk)}
                </span>
                <span
                  className="text-right tabular-nums font-bold"
                  style={{ color: marginColor(m.total_margin).text }}
                >
                  {fmtEur(m.total_margin)}
                </span>
                <span className="text-right tabular-nums text-zinc-700">
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
      ? "bg-emerald-50 ring-emerald-200"
      : highlight === "warn"
      ? "bg-amber-50 ring-amber-200"
      : highlight === "bad"
      ? "bg-rose-50 ring-rose-200"
      : "bg-white ring-zinc-200";
  const valColor =
    highlight === "good"
      ? "text-emerald-700"
      : highlight === "warn"
      ? "text-amber-700"
      : highlight === "bad"
      ? "text-rose-700"
      : "text-zinc-900";
  return (
    <div className={`rounded-xl ring-1 p-4 ${bg}`}>
      <div
        className={`text-[11px] uppercase tracking-wider font-semibold ${
          muted ? "text-zinc-400" : "text-zinc-500"
        }`}
      >
        {label}
      </div>
      <div
        className={`font-display text-[24px] sm:text-[28px] tracking-tight font-medium leading-tight tabular-nums mt-1 ${valColor}`}
      >
        {value}
      </div>
      {delta && (
        <div
          className={`mt-1 text-[11.5px] tabular-nums inline-flex items-center gap-1 font-medium ${
            deltaDirection === "up"
              ? "text-emerald-700"
              : deltaDirection === "down"
              ? "text-rose-700"
              : "text-zinc-500"
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
