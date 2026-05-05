import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { normalizePlate } from "@/lib/plate";
import { VEHICLE_STATUSES, buildVehicleType } from "@/lib/vehicle";
import type { VehicleStatus } from "@/lib/types";

const trimOrNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const numOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const intOrNull = (v: unknown): number | null => {
  const n = numOrNull(v);
  return n == null ? null : Math.round(n);
};

export const POST = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const plate = normalizePlate(body.plate as string);
  if (!plate) return NextResponse.json({ error: "Kennzeichen fehlt" }, { status: 400 });

  const status = VEHICLE_STATUSES.includes(body.status as VehicleStatus)
    ? (body.status as VehicleStatus)
    : "aktiv";

  // vehicle_type wird vom DB-Trigger aus manufacturer/model gebaut, aber falls Client
  // explizit einen Wert mitgibt, respektieren wir das (Backwards-Compat).
  const manufacturer = trimOrNull(body.manufacturer);
  const model = trimOrNull(body.model);
  const explicitType = trimOrNull(body.vehicle_type);
  const computedType = buildVehicleType(manufacturer, model);

  const row = {
    org_id: profile.org_id,
    plate,
    color: trimOrNull(body.color),
    first_registration: trimOrNull(body.first_registration),
    extra_km_price: numOrNull(body.extra_km_price),

    manufacturer,
    model,
    power_ps: intOrNull(body.power_ps),
    fuel_type: trimOrNull(body.fuel_type),
    transmission: trimOrNull(body.transmission),
    doors: trimOrNull(body.doors),
    seats: intOrNull(body.seats),
    luggage: intOrNull(body.luggage),
    body_type: trimOrNull(body.body_type),
    fin_number: trimOrNull(body.fin_number),
    category: trimOrNull(body.category),

    available_from: trimOrNull(body.available_from),
    km_at_intake: intOrNull(body.km_at_intake),
    max_km_total: intOrNull(body.max_km_total),
    inclusive_km_month: intOrNull(body.inclusive_km_month),

    daily_rate: numOrNull(body.daily_rate),
    weekly_rate: numOrNull(body.weekly_rate),
    monthly_rate: numOrNull(body.monthly_rate),
    deposit: numOrNull(body.deposit),

    accessories: trimOrNull(body.accessories),
    status,

    echoes_device_id: trimOrNull(body.echoes_device_id),

    vehicle_type: computedType ?? explicitType,
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .upsert(row, { onConflict: "org_id,plate" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, vehicle: data });
};

export const DELETE = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicles")
    .delete()
    .eq("id", id)
    .eq("org_id", profile.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
