import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const POST = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as { org_name?: string; full_name?: string };
  const orgName = body.org_name?.trim();
  const fullName = body.full_name?.trim() || null;
  if (!orgName) return NextResponse.json({ error: "org_name fehlt" }, { status: 400 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("users")
    .select("id, org_id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, org_id: existing.org_id });

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName, email: user.email, processing_fee: 25 })
    .select("id")
    .single();
  if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });

  const { error: userErr } = await admin.from("users").insert({
    id: user.id,
    org_id: org.id,
    full_name: fullName,
    role: "owner",
  });
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, org_id: org.id });
};
