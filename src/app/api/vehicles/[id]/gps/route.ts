import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { EchoesError, getDevicePosition } from "@/lib/echoes";

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

export const GET = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "true";

  const admin = createAdminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, plate, echoes_device_id, last_gps_lat, last_gps_lng, last_gps_update")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!vehicle)
    return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });
  if (!vehicle.echoes_device_id)
    return NextResponse.json(
      { error: "Diesem Fahrzeug ist kein GPS-Tracker zugeordnet." },
      { status: 400 }
    );

  // Aus Cache liefern wenn nicht refresh
  if (!refresh) {
    return NextResponse.json({
      ok: true,
      lat: vehicle.last_gps_lat,
      lng: vehicle.last_gps_lng,
      recorded_at: vehicle.last_gps_update,
      from_cache: true,
    });
  }

  // Live abrufen → Org-Settings für API-Key
  const { data: org } = await admin
    .from("organizations")
    .select("echoes_api_key, echoes_enabled")
    .eq("id", auth.org_id)
    .single();
  if (!org?.echoes_enabled)
    return NextResponse.json(
      { error: "GPS-Tracking ist für diese Organisation nicht aktiviert." },
      { status: 400 }
    );
  if (!org.echoes_api_key)
    return NextResponse.json({ error: "Kein Echoes API-Key hinterlegt." }, { status: 400 });

  try {
    const pos = await getDevicePosition(org.echoes_api_key, vehicle.echoes_device_id);
    await admin
      .from("vehicles")
      .update({
        last_gps_lat: pos.lat,
        last_gps_lng: pos.lng,
        last_gps_update: pos.recorded_at,
      })
      .eq("id", params.id)
      .eq("org_id", auth.org_id);
    return NextResponse.json({
      ok: true,
      lat: pos.lat,
      lng: pos.lng,
      recorded_at: pos.recorded_at,
      speed_kmh: pos.speed_kmh,
      accuracy_m: pos.accuracy_m,
      from_cache: false,
    });
  } catch (e) {
    if (e instanceof EchoesError)
      return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
};
