import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const PATCH = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile)
    return NextResponse.json({ error: "No profile" }, { status: 401 });

  const body = (await req.json()) as { step?: number; completed?: boolean };
  const update: Record<string, unknown> = {};

  if (typeof body.step === "number") {
    const clamped = Math.max(1, Math.min(5, Math.floor(body.step)));
    update.onboarding_step = clamped;
  }
  if (typeof body.completed === "boolean") {
    update.onboarding_completed = body.completed;
    if (body.completed) update.onboarding_step = 5;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .update(update)
    .eq("id", profile.org_id)
    .select("id, onboarding_completed, onboarding_step")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, org: data });
};
