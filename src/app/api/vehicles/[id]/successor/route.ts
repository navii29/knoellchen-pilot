import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextContractNr } from "@/lib/contract-utils";
import { logActivity } from "@/lib/activity";
import { applyTakeover } from "@/lib/contract-takeover-service";

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
    .select(
      "id, plate, decommission_date, successor_status, successor_vehicle_id, successor_contract_id"
    )
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!oldV) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  // Den zuvor automatisch angelegten Anschluss-Vertrag stornieren, damit er nicht
  // als aktiver Geister-/Doppelvertrag in Verfügbarkeit & Abrechnung weiterläuft.
  const cancelLinkedContract = async () => {
    if (!oldV.successor_contract_id) return;
    await admin
      .from("contracts")
      .update({ status: "storniert", updated_at: now })
      .eq("id", oldV.successor_contract_id)
      .eq("org_id", auth.org_id)
      .eq("status", "aktiv");
  };

  if (body.action === "ersatzlos" || body.action === "reset") {
    const status = body.action === "ersatzlos" ? "ersatzlos" : "offen";
    await cancelLinkedContract();
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

  // Server-Logik mit der UI decken: Nachfolge nur für auslaufende Fahrzeuge.
  if (!oldV.decommission_date)
    return NextResponse.json(
      { error: "Fahrzeug hat kein Aussteuerungsdatum — Nachfolge nicht möglich." },
      { status: 400 }
    );

  const { data: sucV } = await admin
    .from("vehicles")
    .select("id, plate, vehicle_type, daily_rate, deposit")
    .eq("id", successorId)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!sucV) return NextResponse.json({ error: "Folgefahrzeug nicht gefunden" }, { status: 404 });

  // Doppelbelegung verhindern: das Folgefahrzeug darf nicht bereits aktiv
  // vermietet sein (per vehicle_id ODER Kennzeichen).
  const { data: sucActive } = await admin
    .from("contracts")
    .select("id")
    .eq("org_id", auth.org_id)
    .or(`vehicle_id.eq.${sucV.id},plate.eq.${sucV.plate}`)
    .eq("status", "aktiv")
    .limit(1);
  if ((sucActive ?? []).length > 0)
    return NextResponse.json(
      { error: "Folgefahrzeug hat bereits einen aktiven Mietvertrag (Doppelbelegung)." },
      { status: 409 }
    );

  // Bleibender Mieter = aktiver Mietvertrag GENAU dieses Fahrzeugs (vehicle_id).
  // Nur als Fallback der Vertrag über das Kennzeichen, und dann ausschließlich
  // solche ohne vehicle_id (Altdaten) — sonst zieht ein wiederverwendetes
  // Kennzeichen den Vertrag eines fremden Fahrzeugs.
  const { data: byVehicle } = await admin
    .from("contracts")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("vehicle_id", params.id)
    .eq("status", "aktiv")
    .order("pickup_date", { ascending: false })
    .limit(1);
  let oldC = (byVehicle ?? [])[0] as Record<string, unknown> | undefined;
  if (!oldC) {
    const { data: byPlate } = await admin
      .from("contracts")
      .select("*")
      .eq("org_id", auth.org_id)
      .eq("plate", oldV.plate)
      .is("vehicle_id", null)
      .eq("status", "aktiv")
      .order("pickup_date", { ascending: false })
      .limit(1);
    oldC = (byPlate ?? [])[0] as Record<string, unknown> | undefined;
  }
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

  // Idempotenz: war schon ein Nachfolger zugeteilt, dessen Anschluss-Vertrag
  // zuerst stornieren — sonst entsteht bei Neuzuteilung/Doppelklick ein zweiter
  // aktiver (Waisen-)Vertrag.
  await cancelLinkedContract();

  // Insert mit Retry: UNIQUE(org_id, contract_nr) kann bei schneller Anlage
  // kollidieren; bei Kollision (23505) neue Nummer ziehen und erneut versuchen.
  let newC: { id: string; contract_nr: string } | null = null;
  let cErr: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const row =
      attempt === 0 ? insertRow : { ...insertRow, contract_nr: nextContractNr() };
    const res = await admin
      .from("contracts")
      .insert(row)
      .select("id, contract_nr")
      .single();
    if (!res.error) {
      newC = res.data as { id: string; contract_nr: string };
      cErr = null;
      break;
    }
    cErr = res.error;
    if (res.error.code !== "23505") break;
  }
  if (cErr || !newC) return NextResponse.json({ error: cErr?.message ?? "Insert fehlgeschlagen" }, { status: 500 });

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

  // Kunde & Fahrzeug aus dem Anschlussvertrag anlegen/abgleichen.
  try {
    await applyTakeover(admin, auth.org_id, [newC.id]);
  } catch (e) {
    console.error("applyTakeover (successor) fehlgeschlagen:", e);
  }

  await logActivity(admin, auth.user.id, auth.org_id, "contract.create", newC.contract_nr);

  return NextResponse.json({
    ok: true,
    successor_status: "zugeteilt",
    contract_id: newC.id,
    contract_nr: newC.contract_nr,
  });
};
