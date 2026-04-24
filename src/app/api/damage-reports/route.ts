import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { DamageReportStatus } from "@/lib/types";

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

const trimOrNull = (v: unknown) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const STATUSES: ReadonlyArray<DamageReportStatus> = ["offen", "gemeldet", "reguliert"];

export const GET = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("damage_reports")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ damage_reports: data ?? [] });
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  if (!body.date || typeof body.date !== "string") {
    return NextResponse.json({ error: "Pflichtfeld fehlt: date" }, { status: 400 });
  }

  const admin = createAdminClient();
  const contractId = trimOrNull(body.contract_id);
  let vehicleId = trimOrNull(body.vehicle_id);

  // Wenn Vertrag gewählt aber kein Vehicle, ziehen wir Vehicle aus dem Vertrag
  if (contractId && !vehicleId) {
    const { data: c } = await admin
      .from("contracts")
      .select("vehicle_id")
      .eq("id", contractId)
      .eq("org_id", auth.org_id)
      .maybeSingle();
    if (c?.vehicle_id) vehicleId = c.vehicle_id;
  }

  const status = STATUSES.includes(body.status as DamageReportStatus)
    ? (body.status as DamageReportStatus)
    : "offen";

  const insertRow = {
    org_id: auth.org_id,
    contract_id: contractId,
    vehicle_id: vehicleId,
    date: body.date,
    time: trimOrNull(body.time),
    location: trimOrNull(body.location),
    description: trimOrNull(body.description),
    police_reference_nr: trimOrNull(body.police_reference_nr),
    insurance_claim_nr: trimOrNull(body.insurance_claim_nr),
    other_party_name: trimOrNull(body.other_party_name),
    other_party_plate: trimOrNull(body.other_party_plate),
    other_party_insurance: trimOrNull(body.other_party_insurance),
    photos: Array.isArray(body.photos) ? body.photos : [],
    status,
  };

  const { data, error } = await admin
    .from("damage_reports")
    .insert(insertRow)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, damage_report: data });
};
