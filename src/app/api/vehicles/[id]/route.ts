import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

type RouteCtx = { params: { id: string } };

export const PATCH = async (req: Request, { params }: RouteCtx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if ("vehicle_type" in body) patch.vehicle_type = trimOrNull(body.vehicle_type);
  if ("color" in body) patch.color = trimOrNull(body.color);
  if ("first_registration" in body) patch.first_registration = trimOrNull(body.first_registration);
  if ("decommission_reminded" in body) patch.decommission_reminded = Boolean(body.decommission_reminded);
  if ("extra_km_price" in body) {
    const raw = body.extra_km_price;
    if (raw == null || raw === "") {
      patch.extra_km_price = null;
    } else {
      const n = Number(String(raw).replace(",", "."));
      if (Number.isFinite(n) && n >= 0) patch.extra_km_price = n;
    }
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
