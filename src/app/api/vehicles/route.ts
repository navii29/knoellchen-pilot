import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const POST = async (req: Request) => {
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

  const body = (await req.json()) as { plate?: string; vehicle_type?: string; color?: string };
  const plate = body.plate?.trim().toUpperCase();
  if (!plate) return NextResponse.json({ error: "Kennzeichen fehlt" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .upsert(
      {
        org_id: profile.org_id,
        plate,
        vehicle_type: body.vehicle_type?.trim() || null,
        color: body.color?.trim() || null,
      },
      { onConflict: "org_id,plate" }
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, vehicle: data });
};

export const DELETE = async (req: Request) => {
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
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("vehicles")
    .delete()
    .eq("id", id)
    .eq("org_id", profile.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
