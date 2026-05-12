import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { CommissionType, PartnerType } from "@/lib/partners";

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

const VALID_TYPES: ReadonlyArray<PartnerType> = [
  "hotel",
  "agency",
  "portal",
  "workshop",
  "other",
  "partner",
];
const VALID_COMM: ReadonlyArray<CommissionType> = ["fixed", "percent", "margin"];

const trimOrNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};
const numOrNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : null;
};

export const GET = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sales_partners")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("active", { ascending: false })
    .order("name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, partners: data ?? [] });
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = trimOrNull(body.name);
  if (!name) return NextResponse.json({ error: "Name fehlt" }, { status: 400 });
  const type = (body.type as PartnerType) ?? "other";
  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: `Ungültiger Typ: ${type}` }, { status: 400 });
  const commission_type = (body.commission_type as CommissionType) ?? "fixed";
  if (!VALID_COMM.includes(commission_type))
    return NextResponse.json(
      { error: `Ungültiges Provisionsmodell: ${commission_type}` },
      { status: 400 }
    );

  const row = {
    org_id: auth.org_id,
    name,
    type,
    contact_name: trimOrNull(body.contact_name),
    email: trimOrNull(body.email),
    phone: trimOrNull(body.phone),
    address: trimOrNull(body.address),
    tax_number: trimOrNull(body.tax_number),
    commission_type,
    commission_value: numOrNull(body.commission_value),
    active: body.active === false ? false : true,
    notes: trimOrNull(body.notes),
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sales_partners")
    .insert(row)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, partner: data });
};
