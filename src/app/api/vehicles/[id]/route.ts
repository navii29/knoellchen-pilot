import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { VEHICLE_STATUSES } from "@/lib/vehicle";
import { myRole } from "@/lib/team";
import { redactVehicleCost } from "@/lib/redact";
import { syncVehicleToLexoffice } from "@/lib/lexoffice-vehicle-sync";
import type { Vehicle, VehicleStatus } from "@/lib/types";

// Kosten-/Margen-Felder — nur Inhaber dürfen sie setzen/ändern.
const OWNER_ONLY_VEHICLE_FIELDS = [
  "cost_daily",
  "cost_monthly",
  "target_daily_rate",
  "onetime_cost_supplier",
  "onetime_cost_pickup",
  "onetime_cost_return",
];

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

const trimOrNull = (v: unknown) => {
  if (v === undefined) return undefined;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const numOrNull = (v: unknown) => {
  if (v === undefined) return undefined;
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const intOrNull = (v: unknown) => {
  const n = numOrNull(v);
  if (n === undefined) return undefined;
  return n == null ? null : Math.round(n);
};

// Striktes YYYY-MM-DD; undefined-Passthrough (Feld nicht im Body) bleibt erhalten.
const dateOrNull = (v: unknown) => {
  if (v === undefined) return undefined;
  const s = trimOrNull(v);
  if (s == null || typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : s;
};

const TEXT_FIELDS = [
  "vehicle_type",
  "color",
  "manufacturer",
  "model",
  "fuel_type",
  "transmission",
  "doors",
  "body_type",
  "fin_number",
  "category",
  // Fahrzeugschein (Migration 043)
  "hsn",
  "tsn",
  "emission_class",
  "zb2_number",
  // Versicherung (Migration 044)
  "insurer",
  "policy_number",
  "accessories",
  "echoes_device_id",
  // Logistik & Intern (Migration 026)
  "pickup_location",
  "return_location",
  "internal_return_at",
  "internal_return_note",
] as const;

const NUMBER_FIELDS = [
  "extra_km_price",
  "daily_rate",
  "base_daily_rate",
  "weekly_rate",
  "monthly_rate",
  "deposit",
  "cost_daily",
  "cost_monthly",
  "target_daily_rate",
  "onetime_cost_supplier",
  "onetime_cost_pickup",
  "onetime_cost_return",
] as const;

const INT_FIELDS = [
  "power_ps",
  "seats",
  "luggage",
  "km_at_intake",
  "max_km_total",
  "inclusive_km_month",
  // Fahrzeugschein (Migration 043)
  "displacement_ccm",
  "co2_combined",
  "weight_empty",
  "weight_max",
] as const;

const DATE_FIELDS = [
  "first_registration",
  "decommission_date",
  "next_hu",
  "available_from",
  // Versicherung (Migration 044)
  "insurance_valid_until",
] as const;

type RouteCtx = { params: { id: string } };

export const PATCH = async (req: Request, { params }: RouteCtx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const k of TEXT_FIELDS) {
    if (k in body) {
      const v = trimOrNull(body[k]);
      if (v !== undefined) patch[k] = v;
    }
  }
  for (const k of NUMBER_FIELDS) {
    if (k in body) {
      const v = numOrNull(body[k]);
      if (v !== undefined) patch[k] = v;
    }
  }
  for (const k of INT_FIELDS) {
    if (k in body) {
      const v = intOrNull(body[k]);
      if (v !== undefined) patch[k] = v;
    }
  }
  for (const k of DATE_FIELDS) {
    if (k in body) {
      const v = dateOrNull(body[k]);
      if (v !== undefined) patch[k] = v;
    }
  }
  if ("decommission_reminded" in body) {
    patch.decommission_reminded = Boolean(body.decommission_reminded);
  }
  if ("disable_auto_decommission" in body) {
    patch.disable_auto_decommission = Boolean(body.disable_auto_decommission);
  }
  if ("registration_data" in body) {
    patch.registration_data =
      body.registration_data && typeof body.registration_data === "object"
        ? body.registration_data
        : null;
  }
  if ("status" in body && VEHICLE_STATUSES.includes(body.status as VehicleStatus)) {
    patch.status = body.status;
  }

  // Mitarbeiter dürfen Kosten-/Margen-Felder weder ändern noch zurückgelesen bekommen.
  const isOwner = (await myRole()) === "owner";
  if (!isOwner) {
    for (const k of OWNER_ONLY_VEHICLE_FIELDS) delete patch[k];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .update(patch)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // LexOffice-Sync nur wenn relevante Felder geändert wurden (Title-, Preis-
  // oder Beschreibungsfelder) ODER wenn die Article-ID noch fehlt (Backfill).
  const SYNC_TRIGGERS = new Set([
    "manufacturer",
    "model",
    "vehicle_type",
    "fin_number",
    "body_type",
    "fuel_type",
    "power_ps",
    "daily_rate",
  ]);
  const vehicle = data as Vehicle;
  const triggered = Object.keys(patch).some((k) => SYNC_TRIGGERS.has(k));
  if (triggered || !vehicle.lexoffice_product_id) {
    const lexId = await syncVehicleToLexoffice(admin, vehicle, auth.org_id);
    if (lexId && lexId !== vehicle.lexoffice_product_id) {
      vehicle.lexoffice_product_id = lexId;
    }
  }

  return NextResponse.json({ ok: true, vehicle: redactVehicleCost(vehicle, isOwner) });
};
