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

type Ctx = { params: { id: string } };

const sanitizeWeekdays = (v: unknown): number[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  return out.length > 0 ? Array.from(new Set(out)).sort((a, b) => a - b) : null;
};

export const PATCH = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("name" in body) {
    const v = String(body.name ?? "").trim();
    if (!v) return NextResponse.json({ error: "Name darf nicht leer sein" }, { status: 400 });
    update.name = v;
  }
  if ("adjustment_percent" in body) {
    const n = Number(body.adjustment_percent);
    if (!Number.isFinite(n))
      return NextResponse.json({ error: "Ungültige Anpassung" }, { status: 400 });
    update.adjustment_percent = n;
  }
  if ("active" in body) update.active = Boolean(body.active);
  if ("start_date" in body)
    update.start_date = body.start_date ? String(body.start_date) : null;
  if ("end_date" in body)
    update.end_date = body.end_date ? String(body.end_date) : null;
  if ("weekdays" in body) update.weekdays = sanitizeWeekdays(body.weekdays);
  if ("min_fleet_available" in body) {
    const v = body.min_fleet_available;
    update.min_fleet_available =
      v == null || v === "" ? null : Math.round(Number(v));
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pricing_rules")
    .update(update)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rule: data });
};

export const DELETE = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("pricing_rules")
    .delete()
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
