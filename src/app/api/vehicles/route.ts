import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { normalizePlate } from "@/lib/plate";
import { VEHICLE_STATUSES, buildVehicleType } from "@/lib/vehicle";
import { myRole } from "@/lib/team";
import { redactVehicleCost } from "@/lib/redact";
import { syncVehicleToLexoffice } from "@/lib/lexoffice-vehicle-sync";
import type { Vehicle, VehicleStatus } from "@/lib/types";

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

// Striktes YYYY-MM-DD; sonst null. Backstop gegen ungültige KI-Datumswerte,
// die sonst einen rohen Postgres-Fehler auf der DATE-Spalte auslösen würden.
const dateOrNull = (v: unknown): string | null => {
  const s = trimOrNull(v);
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : s;
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
    first_registration: dateOrNull(body.first_registration),
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

    // Fahrzeugschein (Migration 043)
    hsn: trimOrNull(body.hsn),
    tsn: trimOrNull(body.tsn),
    displacement_ccm: intOrNull(body.displacement_ccm),
    co2_combined: intOrNull(body.co2_combined),
    emission_class: trimOrNull(body.emission_class),
    weight_empty: intOrNull(body.weight_empty),
    weight_max: intOrNull(body.weight_max),
    zb2_number: trimOrNull(body.zb2_number),
    next_hu: dateOrNull(body.next_hu),

    // Versicherung (Migration 044) — auch bei der Anlage übernehmen
    insurer: trimOrNull(body.insurer),
    policy_number: trimOrNull(body.policy_number),
    insurance_valid_until: dateOrNull(body.insurance_valid_until),

    registration_data:
      body.registration_data && typeof body.registration_data === "object"
        ? body.registration_data
        : null,

    available_from: dateOrNull(body.available_from),
    km_at_intake: intOrNull(body.km_at_intake),
    max_km_total: intOrNull(body.max_km_total),
    inclusive_km_month: intOrNull(body.inclusive_km_month),

    daily_rate: numOrNull(body.daily_rate),
    base_daily_rate: numOrNull(body.base_daily_rate),
    weekly_rate: numOrNull(body.weekly_rate),
    monthly_rate: numOrNull(body.monthly_rate),
    deposit: numOrNull(body.deposit),
    cost_daily: numOrNull(body.cost_daily),
    cost_monthly: numOrNull(body.cost_monthly),
    target_daily_rate: numOrNull(body.target_daily_rate),

    accessories: trimOrNull(body.accessories),
    status,
    decommission_date: dateOrNull(body.decommission_date),
    disable_auto_decommission: Boolean(body.disable_auto_decommission),

    // Logistik & Intern (Migration 026)
    pickup_location: trimOrNull(body.pickup_location),
    return_location: trimOrNull(body.return_location),
    internal_return_at: trimOrNull(body.internal_return_at),
    internal_return_note: trimOrNull(body.internal_return_note),

    echoes_device_id: trimOrNull(body.echoes_device_id),

    vehicle_type: computedType ?? explicitType,
  };

  // Mitarbeiter dürfen Kosten-/Margen-Felder weder setzen noch zurückgelesen
  // bekommen. Keys ENTFERNEN (nicht null setzen), damit ein Upsert auf ein
  // vorhandenes Fahrzeug die vom Inhaber gepflegten Kosten nicht überschreibt.
  const isOwner = (await myRole()) === "owner";
  if (!isOwner) {
    const r = row as Record<string, unknown>;
    delete r.cost_daily;
    delete r.cost_monthly;
    delete r.target_daily_rate;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .upsert(row, { onConflict: "org_id,plate" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // LexOffice-Sync ist best-effort — Fehler werden geloggt aber blockieren
  // den Vehicle-Save nicht.
  const vehicle = data as Vehicle;
  const lexId = await syncVehicleToLexoffice(admin, vehicle, profile.org_id);
  if (lexId && lexId !== vehicle.lexoffice_product_id) {
    vehicle.lexoffice_product_id = lexId;
  }

  return NextResponse.json({ ok: true, vehicle: redactVehicleCost(vehicle, isOwner) });
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
