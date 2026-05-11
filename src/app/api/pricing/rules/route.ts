import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { PricingRuleType } from "@/lib/types";

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

const VALID_TYPES: PricingRuleType[] = ["season", "weekday", "demand", "custom"];

const trimOrNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const intOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const sanitizeWeekdays = (v: unknown): number[] | null => {
  if (!Array.isArray(v)) return null;
  const out = v
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  return out.length > 0 ? Array.from(new Set(out)).sort((a, b) => a - b) : null;
};

export const GET = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pricing_rules")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("active", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rules: data ?? [] });
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = trimOrNull(body.name);
  const type = body.type as PricingRuleType;
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: `Ungültiger Typ: ${type}` }, { status: 400 });

  const adjustment = Number(body.adjustment_percent);
  if (!Number.isFinite(adjustment))
    return NextResponse.json({ error: "Anpassung in % ist Pflichtfeld" }, { status: 400 });
  if (adjustment < -100 || adjustment > 500)
    return NextResponse.json(
      { error: "Anpassung muss zwischen −100% und +500% liegen" },
      { status: 400 }
    );

  const row = {
    org_id: auth.org_id,
    name,
    type,
    adjustment_percent: adjustment,
    start_date: type === "season" ? trimOrNull(body.start_date) : null,
    end_date: type === "season" ? trimOrNull(body.end_date) : null,
    weekdays: type === "weekday" ? sanitizeWeekdays(body.weekdays) : null,
    min_fleet_available:
      type === "demand" ? intOrNull(body.min_fleet_available) : null,
    active: body.active === false ? false : true,
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pricing_rules")
    .insert(row)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rule: data });
};
