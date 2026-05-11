import Link from "next/link";
import { ChevronRight, Settings, TrendingUp } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/server";
import {
  PRICE_LEVEL_META,
  calculateOptimalPrice,
  priceLevel,
} from "@/lib/pricing";
import type { PricingRule, Vehicle } from "@/lib/types";

export const PricingTodayWidget = async ({ orgId }: { orgId: string }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const admin = createAdminClient();
  const [{ data: vehiclesRaw }, { data: rulesRaw }, { data: contractsRaw }] = await Promise.all([
    admin
      .from("vehicles")
      .select(
        "id, plate, daily_rate, base_daily_rate, manufacturer, model, vehicle_type"
      )
      .eq("org_id", orgId)
      .eq("status", "aktiv"),
    admin.from("pricing_rules").select("*").eq("org_id", orgId).eq("active", true),
    admin
      .from("contracts")
      .select("vehicle_id")
      .eq("org_id", orgId)
      .eq("status", "aktiv")
      .lte("pickup_date", todayIso)
      .gte("return_date", todayIso),
  ]);

  const allVehicles = (vehiclesRaw ?? []) as Vehicle[];
  const rules = (rulesRaw ?? []) as PricingRule[];
  const bookedIds = new Set(
    (contractsRaw ?? [])
      .map((c) => (c as { vehicle_id: string | null }).vehicle_id)
      .filter((id): id is string => !!id)
  );
  const freeVehicles = allVehicles.filter((v) => !bookedIds.has(v.id));
  const items = freeVehicles
    .map((v) => ({
      vehicle: v,
      recommendation: calculateOptimalPrice({
        vehicle: v,
        date: todayIso,
        rules,
        freeFleetCount: freeVehicles.length,
        totalFleetCount: allVehicles.length,
      }),
    }))
    .sort((a, b) => b.recommendation.total_percent - a.recommendation.total_percent);

  if (allVehicles.length === 0) return null;

  return (
    <div className="rounded-xl bg-white ring-1 ring-stone-200 p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-stone-500 font-semibold">
          <TrendingUp size={13} />
          Preisempfehlung heute
          <span className="ml-1 text-stone-400 font-normal normal-case tracking-normal">
            · {freeVehicles.length}/{allVehicles.length} frei
          </span>
        </div>
        <Link
          href="/dashboard/settings/pricing"
          className="inline-flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-900"
        >
          <Settings size={12} /> Regeln
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-sm text-stone-500">
          Heute sind alle Fahrzeuge ausgebucht.
        </div>
      ) : rules.length === 0 ? (
        <div className="py-4 text-center">
          <div className="text-sm text-stone-500 mb-2">
            Noch keine Preisregeln definiert.
          </div>
          <Link
            href="/dashboard/settings/pricing"
            className="inline-flex items-center gap-1 text-[13px] text-teal-700 hover:underline"
          >
            Erste Regel anlegen
            <ChevronRight size={12} />
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {items.slice(0, 6).map(({ vehicle, recommendation }) => {
            const level = priceLevel(recommendation.total_percent);
            const meta = PRICE_LEVEL_META[level];
            const label =
              [vehicle.manufacturer, vehicle.model].filter(Boolean).join(" ") ||
              vehicle.vehicle_type ||
              "Fahrzeug";
            return (
              <Link
                key={vehicle.id}
                href={`/dashboard/vehicles/${vehicle.id}`}
                className="rounded-lg ring-1 px-3.5 py-2.5 transition hover:opacity-80"
                style={{
                  background: meta.bg,
                  boxShadow: `inset 0 0 0 1px ${meta.ring}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] text-stone-700">
                      {vehicle.plate}
                    </div>
                    <div className="text-[12px] text-stone-500 truncate">
                      {label}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className="font-display text-[18px] tracking-tight font-medium leading-none tabular-nums"
                      style={{ color: meta.text }}
                    >
                      {recommendation.final_price
                        .toFixed(2)
                        .replace(".", ",")}
                      <span className="text-[10px] ml-0.5 opacity-70">€</span>
                    </div>
                    {recommendation.total_percent !== 0 && (
                      <div
                        className="text-[10.5px] tabular-nums mt-0.5"
                        style={{ color: meta.text }}
                      >
                        {recommendation.total_percent > 0 ? "+" : ""}
                        {recommendation.total_percent.toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {items.length > 6 && (
        <div className="mt-3 text-[11.5px] text-stone-500 text-center">
          Weitere {items.length - 6} Fahrzeuge in der Flottenübersicht
        </div>
      )}
    </div>
  );
};
