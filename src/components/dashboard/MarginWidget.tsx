import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import {
  computeFleetMargin,
  lastNDaysIso,
  previousPeriodIso,
} from "@/lib/margin";
import { fmtEur } from "@/lib/utils";
import type { Contract, Vehicle } from "@/lib/types";

export const MarginWidget = async ({ orgId }: { orgId: string }) => {
  const period = lastNDaysIso(7);
  const prev = previousPeriodIso(period.from, period.to);

  const admin = createAdminClient();
  const [{ data: vehicles }, { data: contracts }, { data: prevContracts }] =
    await Promise.all([
      admin
        .from("vehicles")
        .select(
          "id, plate, manufacturer, model, vehicle_type, cost_daily, cost_monthly, target_daily_rate, daily_rate, status"
        )
        .eq("org_id", orgId)
        .neq("status", "ausgesteuert"),
      admin
        .from("contracts")
        .select(
          "id, plate, vehicle_id, pickup_date, return_date, actual_return_date, daily_rate, status"
        )
        .eq("org_id", orgId)
        .lte("pickup_date", period.to)
        .gte("return_date", period.from),
      admin
        .from("contracts")
        .select(
          "id, plate, vehicle_id, pickup_date, return_date, actual_return_date, daily_rate, status"
        )
        .eq("org_id", orgId)
        .lte("pickup_date", prev.to)
        .gte("return_date", prev.from),
    ]);

  const vs = (vehicles ?? []) as unknown as Vehicle[];
  if (vs.length === 0) return null;

  // Sind überhaupt Kosten gepflegt? Sonst Empty-State-CTA — sonst zeigt das Widget irreführende 100%-Margen.
  const hasCosts = vs.some(
    (v) =>
      (v.cost_daily != null && Number(v.cost_daily) > 0) ||
      (v.cost_monthly != null && Number(v.cost_monthly) > 0)
  );
  if (!hasCosts) {
    return (
      <Link
        href="/dashboard/vehicles"
        className="group block rounded-xl bg-white ring-1 ring-zinc-200 p-5 hover:ring-zinc-300 transition"
      >
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">
          <Wallet size={13} />
          Margen-Tracking
        </div>
        <div className="font-display text-[20px] tracking-tight text-zinc-900 leading-snug">
          EK-Kosten pflegen, um Margen zu sehen.
        </div>
        <div className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 group-hover:text-emerald-800">
          Fahrzeuge öffnen
          <ArrowRight size={13} />
        </div>
      </Link>
    );
  }

  const current = computeFleetMargin({
    vehicles: vs,
    contracts: (contracts ?? []) as Contract[],
    from: period.from,
    to: period.to,
  });
  const previous = computeFleetMargin({
    vehicles: vs,
    contracts: (prevContracts ?? []) as Contract[],
    from: prev.from,
    to: prev.to,
  });

  const delta = current.total_margin - previous.total_margin;
  const deltaPct =
    Math.abs(previous.total_margin) > 0.01
      ? (delta / Math.abs(previous.total_margin)) * 100
      : null;

  const positive = current.total_margin >= 0;

  return (
    <Link
      href="/dashboard/reports/margin"
      className="block rounded-xl bg-white ring-1 ring-zinc-200 p-5 hover:ring-zinc-300 transition group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500 font-semibold">
          <Wallet size={13} />
          Marge diese Woche
        </div>
        <ChevronRight
          size={14}
          className="text-zinc-400 group-hover:text-zinc-700 transition"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 items-end">
        <div>
          <div
            className={`font-display tabular-nums text-[32px] sm:text-[36px] tracking-tight font-medium leading-none ${
              positive ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {fmtEur(current.total_margin)}
          </div>
          {deltaPct != null && (
            <div
              className={`mt-1.5 text-[12px] font-medium inline-flex items-center gap-1 tabular-nums ${
                delta >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {delta >= 0 ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              {delta >= 0 ? "+" : ""}
              {deltaPct.toFixed(0)}% vs. Vorwoche
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
            Auslastung
          </div>
          <div className="font-display tabular-nums text-[22px] font-medium text-zinc-900 leading-none mt-0.5">
            {current.avg_utilization_pct.toFixed(0)}%
          </div>
          <div className="text-[11.5px] text-zinc-500 tabular-nums mt-1">
            {current.total_rented_days}/{current.total_possible_days} Tage
          </div>
        </div>
      </div>
    </Link>
  );
};
