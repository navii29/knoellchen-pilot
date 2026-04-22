import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextContractNr } from "@/lib/contract-utils";

const COL_ALIASES: Record<string, string[]> = {
  contract_nr: ["vertragsnr", "vertrags_nr", "vertragsnummer", "contract_nr"],
  plate: ["kennzeichen", "plate", "license_plate"],
  vehicle_type: ["fahrzeug", "fahrzeugtyp", "vehicle_type", "modell"],
  renter_name: ["mieter_name", "mieter", "name", "renter_name", "kunde"],
  renter_email: ["mieter_email", "email", "e-mail", "renter_email"],
  renter_address: ["mieter_adresse", "adresse", "address", "renter_address", "anschrift"],
  renter_phone: ["mieter_telefon", "telefon", "phone"],
  renter_birthday: ["mieter_geburtsdatum", "geburtsdatum", "geburtstag", "birthday"],
  renter_license_nr: ["fuehrerschein", "führerschein", "license", "fuehrerscheinnr"],
  pickup_date: ["abholdatum", "pickup", "pickup_date", "von", "mietbeginn"],
  return_date: ["rueckgabedatum", "rückgabedatum", "return_date", "bis", "mietende"],
  daily_rate: ["tagespreis", "daily_rate", "preis_tag"],
  total_amount: ["gesamtbetrag", "summe", "total"],
  deposit: ["kaution", "deposit"],
};

const norm = (s: string) =>
  s.toLowerCase().replace(/^["']|["']$/g, "").trim();

const matchKey = (header: string): string | null => {
  const h = norm(header);
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    if (aliases.includes(h)) return field;
  }
  return null;
};

const parseDate = (s: string | undefined): string | null => {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const deMatch = trimmed.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (deMatch) {
    const [, d, m, y] = deMatch;
    const year = y.length === 2 ? "20" + y : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
};

const numeric = (s: string | undefined): number | null => {
  if (!s) return null;
  const cleaned = s.replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [";", ",", "\t", "|"],
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json({ error: "CSV konnte nicht gelesen werden" }, { status: 400 });
  }

  const headerMap: Record<string, string> = {};
  for (const h of parsed.meta.fields || []) {
    const k = matchKey(h);
    if (k) headerMap[h] = k;
  }
  if (!Object.values(headerMap).includes("plate") || !Object.values(headerMap).includes("renter_name")) {
    return NextResponse.json(
      {
        error: "Pflichtspalten fehlen: kennzeichen, mieter_name (auch: abholdatum, rueckgabedatum)",
        detected: parsed.meta.fields,
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const rows: Record<string, unknown>[] = [];
  const vehiclesSet = new Set<string>();
  const errors: string[] = [];

  for (let idx = 0; idx < parsed.data.length; idx++) {
    const raw = parsed.data[idx];
    const obj: Record<string, string | null> = {};
    for (const [csvHeader, field] of Object.entries(headerMap)) {
      obj[field] = (raw[csvHeader] || "").trim() || null;
    }
    const plate = obj.plate?.toUpperCase();
    const renter = obj.renter_name;
    const pickup = parseDate(obj.pickup_date || undefined);
    const ret = parseDate(obj.return_date || undefined);
    if (!plate || !renter || !pickup || !ret) {
      errors.push(`Zeile ${idx + 2}: Pflichtfelder fehlen`);
      continue;
    }
    vehiclesSet.add(plate);
    rows.push({
      org_id: profile.org_id,
      contract_nr: obj.contract_nr || nextContractNr() + "-" + (idx + 1),
      plate,
      vehicle_type: obj.vehicle_type,
      renter_name: renter,
      renter_email: obj.renter_email,
      renter_phone: obj.renter_phone,
      renter_address: obj.renter_address,
      renter_birthday: obj.renter_birthday,
      renter_license_nr: obj.renter_license_nr,
      pickup_date: pickup,
      return_date: ret,
      daily_rate: numeric(obj.daily_rate || undefined),
      total_amount: numeric(obj.total_amount || undefined),
      deposit: numeric(obj.deposit || undefined),
      status: "aktiv",
    });
  }

  if (vehiclesSet.size > 0) {
    const vehicleRows = Array.from(vehiclesSet).map((p) => ({
      org_id: profile.org_id,
      plate: p,
    }));
    await admin
      .from("vehicles")
      .upsert(vehicleRows, { onConflict: "org_id,plate", ignoreDuplicates: true });
  }

  let inserted = 0;
  if (rows.length > 0) {
    const { error, count } = await admin.from("contracts").insert(rows, { count: "exact" });
    if (error) return NextResponse.json({ error: error.message, errors }, { status: 500 });
    inserted = count ?? rows.length;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skipped: errors.length,
    errors: errors.slice(0, 20),
  });
};
