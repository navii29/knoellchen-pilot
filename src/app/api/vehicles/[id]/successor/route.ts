import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextContractNr } from "@/lib/contract-utils";
import { logActivity } from "@/lib/activity";

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

const addYear = (iso: string): string => {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * Nachfolge-/Folgefahrzeug-Verwaltung für ein auslaufendes Fahrzeug.
 *  - action "assign": weist ein Folgefahrzeug zu und legt für den bleibenden
 *    Mieter direkt einen Anschluss-Mietvertrag an (Start ab Aussteuerungsdatum).
 *  - action "ersatzlos": Fahrzeug läuft ohne Nachfolge aus.
 *  - action "reset": Nachfolge wieder offen.
 */
export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    successor_vehicle_id?: string;
  };
  const now = new Date().toISOString();

  const { data: oldV } = await admin
    .from("vehicles")
    .select("id, plate, decommission_date")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!oldV) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  if (body.action === "ersatzlos" || body.action === "reset") {
    const status = body.action === "ersatzlos" ? "ersatzlos" : "offen";
    const { error } = await admin
      .from("vehicles")
      .update({
        successor_status: status,
        successor_vehicle_id: null,
        successor_contract_id: null,
        updated_at: now,
      })
      .eq("id", params.id)
      .eq("org_id", auth.org_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, successor_status: status });
  }

  if (body.action !== "assign") {
    return NextResponse.json({ error: "Unbekannte action" }, { status: 400 });
  }

  const successorId = body.successor_vehicle_id;
  if (typeof successorId !== "string" || !successorId)
    return NextResponse.json({ error: "Folgefahrzeug fehlt" }, { status: 400 });
  if (successorId === params.id)
    return NextResponse.json(
      { error: "Ein Fahrzeug kann nicht sein eigener Nachfolger sein." },
      { status: 400 }
    );

  const { data: sucV } = await admin
    .from("vehicles")
    .select("id, plate, vehicle_type, daily_rate, deposit")
    .eq("id", successorId)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!sucV) return NextResponse.json({ error: "Folgefahrzeug nicht gefunden" }, { status: 404 });

  // Bleibender Mieter = aktiver Mietvertrag auf dem auslaufenden Fahrzeug.
  const { data: oldContracts } = await admin
    .from("contracts")
    .select("*")
    .eq("org_id", auth.org_id)
    .or(`vehicle_id.eq.${params.id},plate.eq.${oldV.plate}`)
    .eq("status", "aktiv")
    .order("pickup_date", { ascending: false })
    .limit(1);
  const oldC = (oldContracts ?? [])[0] as Record<string, unknown> | undefined;
  if (!oldC)
    return NextResponse.json(
      { error: "Kein aktiver Mietvertrag auf diesem Fahrzeug — keine Nachfolge nötig." },
      { status: 400 }
    );

  const start = (oldV.decommission_date as string | null) ?? now.slice(0, 10);
  const insertRow = {
    org_id: auth.org_id,
    contract_nr: nextContractNr(),
    vehicle_id: sucV.id,
    plate: sucV.plate,
    vehicle_type: sucV.vehicle_type,
    renter_name: oldC.renter_name ?? "",
    renter_email: oldC.renter_email ?? null,
    renter_phone: oldC.renter_phone ?? null,
    renter_address: oldC.renter_address ?? null,
    renter_birthday: oldC.renter_birthday ?? null,
    renter_license_nr: oldC.renter_license_nr ?? null,
    renter_license_class: oldC.renter_license_class ?? null,
    renter_license_expiry: oldC.renter_license_expiry ?? null,
    customer_id: oldC.customer_id ?? null,
    pickup_date: start,
    return_date: addYear(start),
    daily_rate: sucV.daily_rate ?? oldC.daily_rate ?? null,
    deposit: sucV.deposit ?? oldC.deposit ?? null,
    status: "aktiv",
    notes: `Anschluss-Vertrag für auslaufendes Fahrzeug ${oldV.plate}. Laufzeit & Preis bitte prüfen.`,
  };

  const { data: newC, error: cErr } = await admin
    .from("contracts")
    .insert(insertRow)
    .select("id, contract_nr")
    .single();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const { error: vErr } = await admin
    .from("vehicles")
    .update({
      successor_status: "zugeteilt",
      successor_vehicle_id: sucV.id,
      successor_contract_id: newC.id,
      updated_at: now,
    })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

  await logActivity(admin, auth.user.id, auth.org_id, "contract.create", newC.contract_nr);

  return NextResponse.json({
    ok: true,
    successor_status: "zugeteilt",
    contract_id: newC.id,
    contract_nr: newC.contract_nr,
  });
};
