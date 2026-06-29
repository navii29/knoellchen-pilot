import { NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { nextContractNr } from "@/lib/contract-utils";
import { normalizePlate } from "@/lib/plate";
import { applyTakeover } from "@/lib/contract-takeover-service";
import { normalizeDate, normalizeNumber } from "@/lib/csv-import";

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

// Robuste, kalender-validierende Parser aus dem KI-Importer wiederverwenden
// (DRY): normalizeDate verwirft ungültige Daten als null (statt 2020-02-31 an
// die DB zu geben und den Batch zu kippen), normalizeNumber erkennt Punkt- UND
// Komma-Dezimaltrenner (statt 45.50 -> 4550 zu zerstören).
const parseDate = (s: string | undefined): string | null => normalizeDate(s ?? "");
const numeric = (s: string | undefined): number | null => normalizeNumber(s ?? "");

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
    const plate = normalizePlate(obj.plate);
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
      original_return_date: ret,
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
    const { error: vUpsertErr } = await admin
      .from("vehicles")
      .upsert(vehicleRows, { onConflict: "org_id,plate", ignoreDuplicates: true });
    if (vUpsertErr)
      console.error(
        "[import] vehicles.upsert fehlgeschlagen (" + vehicleRows.length + " Kennzeichen):",
        vUpsertErr.code ?? "",
        vUpsertErr.message
      );
  }

  let inserted = 0;
  let customersCreated = 0;
  let customersStepOk = true;
  if (rows.length > 0) {
    const { data, error } = await admin
      .from("contracts")
      .insert(rows)
      .select("id");
    if (error) return NextResponse.json({ error: error.message, errors }, { status: 500 });
    const insertedIds = ((data ?? []) as { id: string }[]).map((r) => r.id);
    inserted = insertedIds.length || rows.length;
    // Kunden & Fahrzeuge aus den importierten Verträgen anlegen/abgleichen.
    // Fehler hier kippen den Vertrags-Import NICHT — werden aber jetzt sichtbar
    // (customers_step_ok), statt still zu verschwinden.
    try {
      const tk = await applyTakeover(admin, profile.org_id, insertedIds);
      customersCreated = tk.customersCreated;
      customersStepOk = !tk.loadFailed;
    } catch (e) {
      console.error("applyTakeover (import) fehlgeschlagen:", e);
      customersStepOk = false;
    }
  }

  return NextResponse.json({
    ok: true,
    inserted,
    customers_created: customersCreated,
    customers_step_ok: customersStepOk,
    skipped: errors.length,
    errors: errors.slice(0, 20),
  });
};
