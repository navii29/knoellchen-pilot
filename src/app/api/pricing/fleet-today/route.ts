import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateOptimalPrice } from "@/lib/pricing";
import type { PricingRule, Vehicle } from "@/lib/types";

const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id } : null;
};

export const GET = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const admin = createAdminClient();

  const [{ data: vehiclesRaw }, { data: rulesRaw }, { data: contractsRaw }] = await Promise.all([
    admin
      .from("vehicles")
      .select(
        "id, plate, daily_rate, base_daily_rate, manufacturer, model, vehicle_type, status"
      )
      .eq("org_id", auth.org_id)
      .eq("status", "aktiv"),
    admin.from("pricing_rules").select("*").eq("org_id", auth.org_id).eq("active", true),
    admin
      .from("contracts")
      .select("vehicle_id, pickup_date, return_date")
      .eq("org_id", auth.org_id)
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
  const totalFleet = allVehicles.length;
  const freeFleetCount = freeVehicles.length;

  const items = freeVehicles.map((v) => {
    const recommendation = calculateOptimalPrice({
      vehicle: v,
      date: todayIso,
      rules,
      freeFleetCount,
      totalFleetCount: totalFleet,
    });
    return {
      vehicle_id: v.id,
      plate: v.plate,
      label:
        [v.manufacturer, v.model].filter(Boolean).join(" ") ||
        v.vehicle_type ||
        "Fahrzeug",
      recommendation,
    };
  });

  // Sortiert nach Aufschlag absteigend (interessanteste oben)
  items.sort(
    (a, b) => b.recommendation.total_percent - a.recommendation.total_percent
  );

  return NextResponse.json({
    ok: true,
    date: todayIso,
    total_fleet: totalFleet,
    free_fleet: freeFleetCount,
    items,
  });
};
