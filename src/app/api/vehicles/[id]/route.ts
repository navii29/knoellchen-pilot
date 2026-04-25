import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { VEHICLE_STATUSES } from "@/lib/vehicle";
import type { VehicleStatus } from "@/lib/types";

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

const TEXT_FIELDS = [
  "vehicle_type",
  "color",
  "first_registration",
  "manufacturer",
  "model",
  "fuel_type",
  "transmission",
  "doors",
  "body_type",
  "fin_number",
  "category",
  "available_from",
  "accessories",
] as const;

const NUMBER_FIELDS = [
  "extra_km_price",
  "daily_rate",
  "weekly_rate",
  "monthly_rate",
  "deposit",
] as const;

const INT_FIELDS = [
  "power_ps",
  "seats",
  "luggage",
  "km_at_intake",
  "max_km_total",
  "inclusive_km_month",
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
  if ("decommission_reminded" in body) {
    patch.decommission_reminded = Boolean(body.decommission_reminded);
  }
  if ("status" in body && VEHICLE_STATUSES.includes(body.status as VehicleStatus)) {
    patch.status = body.status;
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
  return NextResponse.json({ ok: true, vehicle: data });
};
