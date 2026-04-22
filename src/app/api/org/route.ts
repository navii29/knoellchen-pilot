import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ("processing_fee" in update) update.processing_fee = Number(update.processing_fee);
  if ("email_automation_enabled" in update)
    update.email_automation_enabled = Boolean(update.email_automation_enabled);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .update(update)
    .eq("id", profile.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, org: data });
};
