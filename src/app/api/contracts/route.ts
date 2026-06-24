import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextContractNr } from "@/lib/contract-utils";
import { computeExtraKm } from "@/lib/km";
import { normalizePlate } from "@/lib/plate";
import { myRole, requirePermission } from "@/lib/team";
import { redactContractPartner } from "@/lib/redact";
import { logActivity } from "@/lib/activity";
import type { Contract } from "@/lib/types";

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

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const required = ["plate", "renter_name", "pickup_date", "return_date"];
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `Pflichtfeld fehlt: ${k}` }, { status: 400 });
  }
  // ISO-Datumsstrings (YYYY-MM-DD) vergleichen chronologisch per String-Vergleich.
  if (String(body.return_date) < String(body.pickup_date))
    return NextResponse.json(
      { error: "Rückgabedatum darf nicht vor dem Abholdatum liegen." },
      { status: 400 }
    );

  const admin = createAdminClient();
  const plate = normalizePlate(body.plate as string);
  if (!plate) return NextResponse.json({ error: "Kennzeichen ungültig" }, { status: 400 });

  // Anreicherung des (ggf. neu angelegten) Fahrzeugs aus den Vertrags-OCR-Daten.
  // Die OCR-FIN (Feld "vin") wird in die Spalte fin_number geschrieben.
  const trimStr = (v: unknown) => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length > 0 ? s : null;
  };
  // Spalten existieren: manufacturer, model, color, fuel_type, fin_number.
  // Der DB-Trigger sync_vehicle_type baut vehicle_type aus manufacturer/model
  // neu — das ist gewünscht und wird hier nicht umgangen.
  //
  // BEWUSST OHNE first_registration: ein DB-Trigger setzt decommission_date =
  // first_registration + 180 Tage, wenn decommission_date NULL ist. Würde die
  // Vertragsanlage das first_registration setzen, könnte ein Fahrzeug dadurch
  // automatisch ausgeflottet werden und aus der Verfügbarkeit verschwinden.
  // first_registration bleibt nur über die explizite Fahrzeug-Bearbeitung/
  // -Backfill setzbar.
  const vehiclePatch: Record<string, string> = {};
  for (const [key, raw] of [
    ["manufacturer", body.manufacturer],
    ["model", body.model],
    ["color", body.color],
    ["fuel_type", body.fuel_type],
    ["fin_number", body.vin],
  ] as const) {
    const val = trimStr(raw);
    if (val !== null) vehiclePatch[key] = val;
  }

  await admin
    .from("vehicles")
    .upsert(
      // Nur Nicht-Null-Felder mitschreiben, damit bei einem frisch angelegten
      // Fahrzeug keine NULLs ueber die Spalten-Defaults geschrieben werden.
      { org_id: auth.org_id, plate, vehicle_type: body.vehicle_type ?? null, ...vehiclePatch },
      { onConflict: "org_id,plate", ignoreDuplicates: true }
    );
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id, vehicle_type, manufacturer, model, color, first_registration, fuel_type, fin_number")
    .eq("org_id", auth.org_id)
    .eq("plate", plate)
    .maybeSingle();

  // Fill-if-empty: bestand das Fahrzeug bereits (oder wurde durch einen
  // parallelen Vorgang anders befuellt), ergaenzen wir NUR Felder, die in der DB
  // aktuell NULL/leer sind — bestehende Nicht-Null-Werte werden NIE ueberschrieben.
  // Das erfuellt "auch wenn das Fahrzeug bereits vorhanden ist".
  // Kanonischer vehicle_type fuer den Vertrag — wird nach einem evtl. Trigger-
  // Rebuild (manufacturer/model-Update) neu gelesen, damit Vertrag == Fahrzeug.
  let effectiveVehicleType: string | null =
    (vehicle?.vehicle_type as string | null) ?? null;
  if (vehicle) {
    const fillPatch: Record<string, string> = {};
    for (const key of [
      "manufacturer",
      "model",
      "color",
      "fuel_type",
      "fin_number",
    ] as const) {
      const ocrVal = vehiclePatch[key];
      const current = (vehicle as Record<string, unknown>)[key];
      const currentEmpty =
        current == null || (typeof current === "string" && current.trim() === "");
      if (ocrVal != null && currentEmpty) fillPatch[key] = ocrVal;
    }
    if (Object.keys(fillPatch).length > 0) {
      // Mit .select(): der Trigger sync_vehicle_type baut vehicle_type aus
      // manufacturer/model neu — wir uebernehmen genau diesen Wert.
      const { data: updated } = await admin
        .from("vehicles")
        .update(fillPatch)
        .eq("org_id", auth.org_id)
        .eq("plate", plate)
        .select("vehicle_type")
        .maybeSingle();
      if (updated?.vehicle_type != null)
        effectiveVehicleType = updated.vehicle_type as string;
    }
  }

  const numeric = (v: unknown) =>
    v == null || v === "" ? null : Number(v);

  const customerIdRaw = (body.customer_id as string)?.trim();
  const customerIdInput = customerIdRaw && customerIdRaw.length > 0 ? customerIdRaw : null;

  // SECURITY (Multi-Tenant): customer_id muss zur eigenen Org gehoeren. Ohne
  // diese Pruefung liesse sich ein Vertrag per FK auf einen Fremd-Org-Kunden
  // setzen (Single-Column-FK customers(id) ohne org), wodurch z. B. checkin-link
  // die E-Mail eines fremden Mandanten zurueckgeben wuerde.
  let customerId: string | null = null;
  if (customerIdInput) {
    const { data: cust } = await admin
      .from("customers")
      .select("id")
      .eq("id", customerIdInput)
      .eq("org_id", auth.org_id)
      .maybeSingle();
    if (!cust)
      return NextResponse.json(
        { error: "Kunde gehört nicht zu dieser Organisation." },
        { status: 400 }
      );
    customerId = cust.id;
  }

  const kmPickup = numeric(body.km_pickup);
  const kmReturn = numeric(body.km_return);
  const kmLimit = numeric(body.km_limit);

  let vehiclePrice: number | null = null;
  if (vehicle?.id) {
    const { data: v } = await admin
      .from("vehicles")
      .select("extra_km_price")
      .eq("id", vehicle.id)
      .maybeSingle();
    if (v?.extra_km_price != null) vehiclePrice = Number(v.extra_km_price);
  }

  const extra = computeExtraKm({
    kmPickup,
    kmReturn,
    kmLimit,
    pricePerKm: vehiclePrice,
  });
  const extraKmCost = extra ? extra.cost : null;

  const providedNr = (body.contract_nr as string)?.trim();
  const insertRow = {
    org_id: auth.org_id,
    contract_nr: providedNr || nextContractNr(),
    vehicle_id: vehicle?.id ?? null,
    customer_id: customerId,
    plate,
    // Kanonischen vehicle_type aus der Fahrzeug-Stammdaten-Zeile übernehmen
    // (vom Trigger sync_vehicle_type aus manufacturer/model gebaut), damit
    // Vertrag == Fahrzeug-Master. Fallback auf den vom Client übergebenen Wert.
    vehicle_type: effectiveVehicleType ?? (body.vehicle_type as string) ?? null,
    renter_name: String(body.renter_name).trim(),
    renter_email: (body.renter_email as string)?.trim() || null,
    renter_phone: (body.renter_phone as string)?.trim() || null,
    renter_address: (body.renter_address as string)?.trim() || null,
    renter_birthday: (body.renter_birthday as string)?.trim() || null,
    renter_license_nr: (body.renter_license_nr as string)?.trim() || null,
    renter_license_class: (body.renter_license_class as string)?.trim() || null,
    renter_license_expiry: (body.renter_license_expiry as string)?.trim() || null,
    pickup_date: body.pickup_date as string,
    pickup_time: (body.pickup_time as string) ?? null,
    return_date: body.return_date as string,
    return_time: (body.return_time as string) ?? null,
    daily_rate: numeric(body.daily_rate),
    total_amount: numeric(body.total_amount),
    deposit: numeric(body.deposit),
    km_pickup: kmPickup,
    km_return: kmReturn,
    km_limit: kmLimit,
    extra_km_cost: extraKmCost,
    contract_pdf_path: (body.contract_pdf_path as string) ?? null,
    notes: (body.notes as string) ?? null,
    status: (body.status as string) ?? "aktiv",
    partner_id: (body.partner_id as string) || null,
    partner_purchase_price: numeric(body.partner_purchase_price),
    partner_selling_price: numeric(body.partner_selling_price),
    partner_commission: numeric(body.partner_commission),
    payment_method: (body.payment_method as string) || null,
    insurance_type: (body.insurance_type as string) || null,
    insurance_deductible: numeric(body.insurance_deductible),
    special_terms: (body.special_terms as string) || null,
    delivery_cost: numeric(body.delivery_cost),
    pickup_cost: numeric(body.pickup_cost),
    driver2_name: (body.driver2_name as string) || null,
    driver2_license: (body.driver2_license as string) || null,
    damages_at_handover: (body.damages_at_handover as string) || null,
    keys_count: numeric(body.keys_count),
    selected_special_terms: Array.isArray(body.selected_special_terms)
      ? (body.selected_special_terms as string[])
      : [],
    custom_special_terms: (body.custom_special_terms as string) || null,
  };

  // Mitarbeiter dürfen keine Partner-Verrechnung setzen (Partner = owner-only).
  const isOwner = (await myRole()) === "owner";
  if (!isOwner) {
    insertRow.partner_id = null;
    insertRow.partner_purchase_price = null;
    insertRow.partner_selling_price = null;
    insertRow.partner_commission = null;
  } else if (insertRow.partner_id) {
    // SECURITY (Multi-Tenant): partner_id muss zur eigenen Org gehoeren, sonst
    // referenziert der Vertrag einen Partner einer fremden Organisation.
    const { data: p } = await admin
      .from("sales_partners")
      .select("id")
      .eq("id", insertRow.partner_id)
      .eq("org_id", auth.org_id)
      .maybeSingle();
    if (!p) {
      insertRow.partner_id = null;
      insertRow.partner_purchase_price = null;
      insertRow.partner_selling_price = null;
      insertRow.partner_commission = null;
    }
  }

  // Insert mit Retry gegen UNIQUE(org_id, contract_nr)-Kollision: nur bei
  // automatisch generierter Nummer eine neue ziehen (vom Nutzer vergebene
  // Nummern nicht stillschweigend ueberschreiben).
  let data: Record<string, unknown> | null = null;
  let error: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await admin.from("contracts").insert(insertRow).select("*").single();
    if (!res.error) {
      data = res.data;
      error = null;
      break;
    }
    error = res.error;
    if (res.error.code !== "23505" || providedNr) break;
    insertRow.contract_nr = nextContractNr();
  }
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert fehlgeschlagen" }, { status: 500 });
  await logActivity(
    admin,
    auth.user.id,
    auth.org_id,
    "contract.create",
    (data as { contract_nr?: string })?.contract_nr ?? null
  );
  // Defense-in-depth: Partner-Verrechnung nie ungereinigt an Mitarbeiter zurueck.
  return NextResponse.json({
    ok: true,
    contract: redactContractPartner(data as unknown as Contract, isOwner),
  });
};

export const DELETE = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gate = await requirePermission("delete");
  if (!gate.ok) return gate.res;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("contracts")
    .delete()
    .eq("id", id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
