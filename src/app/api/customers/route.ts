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
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

export const GET = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("last_name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data ?? [] });
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  if (!body.last_name || String(body.last_name).trim() === "") {
    return NextResponse.json({ error: "Pflichtfeld fehlt: last_name" }, { status: 400 });
  }

  const insertRow = {
    org_id: auth.org_id,
    salutation: trimOrNull(body.salutation),
    title: trimOrNull(body.title),
    first_name: trimOrNull(body.first_name),
    last_name: String(body.last_name).trim(),
    birthday: trimOrNull(body.birthday),
    street: trimOrNull(body.street),
    house_nr: trimOrNull(body.house_nr),
    zip: trimOrNull(body.zip),
    city: trimOrNull(body.city),
    country: trimOrNull(body.country) ?? "Deutschland",
    email: trimOrNull(body.email),
    phone: trimOrNull(body.phone),
    license_nr: trimOrNull(body.license_nr),
    license_class: trimOrNull(body.license_class),
    license_expiry: trimOrNull(body.license_expiry),
    id_card_nr: trimOrNull(body.id_card_nr),
    license_photo_path: trimOrNull(body.license_photo_path),
    id_card_photo_path: trimOrNull(body.id_card_photo_path),
    notes: trimOrNull(body.notes),
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .insert(insertRow)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, customer: data });
};
