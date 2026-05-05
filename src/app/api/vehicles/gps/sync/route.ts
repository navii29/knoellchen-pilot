import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { EchoesError, getDevicePosition } from "@/lib/echoes";

export const maxDuration = 60;

export const POST = async () => {
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
  const { data: org } = await admin
    .from("organizations")
    .select("echoes_api_key, echoes_enabled")
    .eq("id", profile.org_id)
    .single();
  if (!org?.echoes_enabled)
    return NextResponse.json(
      { error: "GPS-Tracking ist für diese Organisation nicht aktiviert." },
      { status: 400 }
    );
  if (!org.echoes_api_key)
    return NextResponse.json({ error: "Kein Echoes API-Key hinterlegt." }, { status: 400 });

  const { data: vehicles } = await admin
    .from("vehicles")
    .select("id, plate, echoes_device_id")
    .eq("org_id", profile.org_id)
    .not("echoes_device_id", "is", null);

  const results: Array<{
    vehicle_id: string;
    plate: string;
    ok: boolean;
    error?: string;
  }> = [];

  for (const v of vehicles ?? []) {
    if (!v.echoes_device_id) continue;
    try {
      const pos = await getDevicePosition(org.echoes_api_key, v.echoes_device_id);
      await admin
        .from("vehicles")
        .update({
          last_gps_lat: pos.lat,
          last_gps_lng: pos.lng,
          last_gps_update: pos.recorded_at,
        })
        .eq("id", v.id)
        .eq("org_id", profile.org_id);
      results.push({ vehicle_id: v.id, plate: v.plate, ok: true });
    } catch (e) {
      const msg =
        e instanceof EchoesError
          ? e.message
          : e instanceof Error
          ? e.message
          : "Unbekannter Fehler";
      results.push({ vehicle_id: v.id, plate: v.plate, ok: false, error: msg });
    }
  }

  const success = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    total: results.length,
    success,
    failed: results.length - success,
    results,
  });
};
