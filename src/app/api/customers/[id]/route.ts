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

const FIELDS = [
  "salutation",
  "title",
  "first_name",
  "last_name",
  "birthday",
  "street",
  "house_nr",
  "zip",
  "city",
  "country",
  "email",
  "phone",
  "license_nr",
  "license_class",
  "license_expiry",
  "id_card_nr",
  "license_photo_path",
  "id_card_photo_path",
  "notes",
] as const;

type RouteCtx = { params: { id: string } };

export const GET = async (_req: Request, { params }: RouteCtx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ customer: data });
};

export const PATCH = async (req: Request, { params }: RouteCtx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of FIELDS) {
    if (k in body) {
      const v = trimOrNull(body[k]);
      if (v !== undefined) patch[k] = v;
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .update(patch)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, customer: data });
};

export const DELETE = async (_req: Request, { params }: RouteCtx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .delete()
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
