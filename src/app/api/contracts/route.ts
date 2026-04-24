import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextContractNr } from "@/lib/contract-utils";

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

  const admin = createAdminClient();
  const plate = String(body.plate).trim().toUpperCase();
  await admin
    .from("vehicles")
    .upsert(
      { org_id: auth.org_id, plate, vehicle_type: body.vehicle_type ?? null },
      { onConflict: "org_id,plate", ignoreDuplicates: true }
    );
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("org_id", auth.org_id)
    .eq("plate", plate)
    .maybeSingle();

  const numeric = (v: unknown) =>
    v == null || v === "" ? null : Number(v);

  const customerIdRaw = (body.customer_id as string)?.trim();
  const customerId = customerIdRaw && customerIdRaw.length > 0 ? customerIdRaw : null;

  const insertRow = {
    org_id: auth.org_id,
    contract_nr: (body.contract_nr as string)?.trim() || nextContractNr(),
    vehicle_id: vehicle?.id ?? null,
    customer_id: customerId,
    plate,
    vehicle_type: (body.vehicle_type as string) ?? null,
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
    km_pickup: numeric(body.km_pickup),
    contract_pdf_path: (body.contract_pdf_path as string) ?? null,
    notes: (body.notes as string) ?? null,
    status: (body.status as string) ?? "aktiv",
  };

  const { data, error } = await admin
    .from("contracts")
    .insert(insertRow)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, contract: data });
};

export const DELETE = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
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
