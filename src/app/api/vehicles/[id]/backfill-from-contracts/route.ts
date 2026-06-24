import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { buildVehicleBackfillFromContracts } from "@/lib/vehicle";

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

export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { org_id } = auth;
  const admin = createAdminClient();

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, org_id, plate, manufacturer, model, vehicle_type, daily_rate, deposit")
    .eq("id", params.id)
    .eq("org_id", org_id)
    .maybeSingle();
  if (!vehicle) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  // Verträge führen kein separates manufacturer/model — nur vehicle_type.
  // Hersteller/Modell leitet der Helper aus dem vehicle_type ab.
  const { data: contractRows } = await admin
    .from("contracts")
    .select("vehicle_type, daily_rate, deposit, pickup_date")
    .eq("org_id", org_id)
    .eq("plate", vehicle.plate)
    .order("pickup_date", { ascending: false });

  const contracts = contractRows ?? [];
  const patch = buildVehicleBackfillFromContracts(vehicle, contracts);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, filled: [] });
  }

  await admin
    .from("vehicles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("org_id", org_id);

  return NextResponse.json({ ok: true, filled: Object.keys(patch) });
};
