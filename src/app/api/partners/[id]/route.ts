import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ownerOnly } from "@/lib/team";
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

type Ctx = { params: { id: string } };

const VALID_TYPES: ReadonlyArray<PartnerType> = [
  "hotel",
  "agency",
  "portal",
  "workshop",
  "other",
  "partner",
];
const VALID_COMM: ReadonlyArray<CommissionType> = ["fixed", "percent", "margin"];

const TEXT_FIELDS = [
  "name",
  "contact_name",
  "email",
  "phone",
  "address",
  "tax_number",
  "notes",
] as const;

const trimOrNull = (v: unknown): string | null | undefined => {
  if (v === undefined) return undefined;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};
const numOrNull = (v: unknown): number | null | undefined => {
  if (v === undefined) return undefined;
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : null;
};

export const PATCH = async (req: Request, { params }: Ctx) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  for (const k of TEXT_FIELDS) {
    if (k in body) {
      const v = trimOrNull(body[k]);
      if (v !== undefined) update[k] = v;
    }
  }
  if ("commission_value" in body) {
    const v = numOrNull(body.commission_value);
    if (v !== undefined) update.commission_value = v;
  }
  if ("active" in body) update.active = Boolean(body.active);
  if ("type" in body) {
    if (!VALID_TYPES.includes(body.type as PartnerType))
      return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 });
    update.type = body.type;
  }
  if ("commission_type" in body) {
    if (!VALID_COMM.includes(body.commission_type as CommissionType))
      return NextResponse.json({ error: "Ungültiges Provisionsmodell" }, { status: 400 });
    update.commission_type = body.commission_type;
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sales_partners")
    .update(update)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, partner: data });
};

export const DELETE = async (_req: Request, { params }: Ctx) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("sales_partners")
    .delete()
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
