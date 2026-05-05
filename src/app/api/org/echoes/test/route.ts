import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { EchoesError, getDevices } from "@/lib/echoes";

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
    .select("echoes_api_key, echoes_account_id")
    .eq("id", profile.org_id)
    .single();
  const apiKey = org?.echoes_api_key;
  const accountId = org?.echoes_account_id;
  if (!apiKey)
    return NextResponse.json({ error: "Kein Echoes API-Key hinterlegt." }, { status: 400 });
  if (!accountId)
    return NextResponse.json({ error: "Keine Echoes Account-ID hinterlegt." }, { status: 400 });

  try {
    const devices = await getDevices(apiKey, accountId);
    const online = devices.filter((d) => d.online).length;
    return NextResponse.json({
      ok: true,
      profile: {
        device_count: devices.length,
        online_count: online,
        sample: devices.slice(0, 3).map((d) => ({
          id: d.id,
          label: d.label,
          plate: d.plate,
          online: d.online,
        })),
      },
      stub_warning:
        "Stub-Daten — sobald die echte Echoes-API-Doku vorliegt, werden hier echte Tracker angezeigt.",
    });
  } catch (e) {
    if (e instanceof EchoesError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
};
