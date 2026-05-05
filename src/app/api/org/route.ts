import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const SAFE_COLUMNS =
  "id, name, street, zip, city, phone, email, tax_number, processing_fee, slug, inbound_email, sender_name, sender_email, email_automation_enabled, lexoffice_enabled, onboarding_completed, onboarding_step, created_at";

const stripSecrets = <T extends Record<string, unknown>>(row: T) => {
  const copy = { ...row } as T & { lexoffice_api_key?: string };
  delete copy.lexoffice_api_key;
  return copy as Omit<T, "lexoffice_api_key">;
};

export const PATCH = async (req: Request) => {
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
  const allowed = [
    "name",
    "street",
    "zip",
    "city",
    "phone",
    "email",
    "tax_number",
    "processing_fee",
    "sender_name",
    "sender_email",
    "email_automation_enabled",
    "lexoffice_api_key",
    "lexoffice_enabled",
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ("processing_fee" in update) update.processing_fee = Number(update.processing_fee);
  if ("email_automation_enabled" in update)
    update.email_automation_enabled = Boolean(update.email_automation_enabled);
  if ("lexoffice_enabled" in update)
    update.lexoffice_enabled = Boolean(update.lexoffice_enabled);
  if ("lexoffice_api_key" in update) {
    const v = update.lexoffice_api_key;
    update.lexoffice_api_key =
      typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .update(update)
    .eq("id", profile.org_id)
    .select(SAFE_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hinweis: SAFE_COLUMNS enthält bereits keine api_key-Spalte; stripSecrets ist
  // doppelter Schutz für den Fall, dass jemand SAFE_COLUMNS später erweitert.
  return NextResponse.json({
    ok: true,
    org: stripSecrets(data),
    lexoffice_has_key: false, // wird durch GET separat geliefert
  });
};

export const GET = async () => {
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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(`${SAFE_COLUMNS}, lexoffice_api_key`)
    .eq("id", profile.org_id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasKey =
    typeof data.lexoffice_api_key === "string" && data.lexoffice_api_key.length > 0;

  return NextResponse.json({
    ok: true,
    org: stripSecrets(data as Record<string, unknown>),
    lexoffice_has_key: hasKey,
  });
};
