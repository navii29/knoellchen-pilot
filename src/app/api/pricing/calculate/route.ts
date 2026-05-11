import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  calculateOptimalPrice,
  calculatePeriodAverage,
} from "@/lib/pricing";
import { normalizePlate } from "@/lib/plate";
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

const todayIso = () => new Date().toISOString().slice(0, 10);

const eachDateBetween = (from: string, to: string): string[] => {
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

// Frei am Tag = Gesamt-Flotte − Aktive Verträge, die diesen Tag abdecken
const buildFreeFleetMap = async (
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  dates: string[]
): Promise<{ map: Map<string, number>; total: number }> => {
  const { count } = await admin
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);
  const total = count ?? 0;

  if (dates.length === 0 || total === 0)
    return { map: new Map(), total };

  const min = dates[0];
  const max = dates[dates.length - 1];

  // Alle Verträge holen, die mit dem Zeitraum überlappen
  const { data: contracts } = await admin
    .from("contracts")
    .select("pickup_date, return_date, status")
    .eq("org_id", orgId)
    .eq("status", "aktiv")
    .lte("pickup_date", max)
    .gte("return_date", min);

  const map = new Map<string, number>();
  for (const date of dates) {
    let booked = 0;
    for (const c of contracts ?? []) {
      if (c.pickup_date <= date && c.return_date >= date) booked += 1;
    }
    map.set(date, Math.max(0, total - booked));
  }
  return { map, total };
};

export const GET = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const vehicleId = url.searchParams.get("vehicle_id");
  const plateParam = url.searchParams.get("plate");
  const date = url.searchParams.get("date") || todayIso();
  const pickup = url.searchParams.get("pickup_date");
  const ret = url.searchParams.get("return_date");

  if (!vehicleId && !plateParam)
    return NextResponse.json({ error: "vehicle_id oder plate fehlt" }, { status: 400 });

  const admin = createAdminClient();
  let q = admin
    .from("vehicles")
    .select("id, plate, daily_rate, base_daily_rate, manufacturer, model, vehicle_type")
    .eq("org_id", auth.org_id);
  if (vehicleId) q = q.eq("id", vehicleId);
  else if (plateParam) {
    const plate = normalizePlate(plateParam);
    if (!plate)
      return NextResponse.json({ error: `Kennzeichen ungültig: ${plateParam}` }, { status: 400 });
    q = q.eq("plate", plate);
  }
  const { data: vehicle } = await q.maybeSingle();
  if (!vehicle)
    return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const { data: rulesRaw } = await admin
    .from("pricing_rules")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("active", true);
  const rules = (rulesRaw ?? []) as PricingRule[];

  // Mehrtagiger Zeitraum?
  if (pickup && ret) {
    const dates = eachDateBetween(pickup, ret);
    const { map, total } = await buildFreeFleetMap(admin, auth.org_id, dates);
    const period = calculatePeriodAverage({
      vehicle: vehicle as unknown as Vehicle,
      pickupDate: pickup,
      returnDate: ret,
      rules,
      freeFleetByDate: map,
      totalFleetCount: total,
    });
    return NextResponse.json({
      ok: true,
      mode: "period",
      vehicle: { id: vehicle.id, plate: vehicle.plate },
      period,
    });
  }

  // Einzelner Tag
  const { map, total } = await buildFreeFleetMap(admin, auth.org_id, [date]);
  const recommendation = calculateOptimalPrice({
    vehicle: vehicle as unknown as Vehicle,
    date,
    rules,
    freeFleetCount: map.get(date) ?? null,
    totalFleetCount: total,
  });
  return NextResponse.json({
    ok: true,
    mode: "day",
    vehicle: { id: vehicle.id, plate: vehicle.plate },
    recommendation,
  });
};
