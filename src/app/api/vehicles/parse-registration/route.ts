import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { parseVehicleRegistration } from "@/lib/anthropic";
import { normalizePlate } from "@/lib/plate";
import { buildVehicleType } from "@/lib/vehicle";

export const maxDuration = 60;

// Spalten, die der Schein befüllt — für die Gegenprüfung "schon vorhanden?".
const PARSE_COLUMNS = [
  "manufacturer",
  "model",
  "fin_number",
  "first_registration",
  "color",
  "fuel_type",
  "power_ps",
  "seats",
  "body_type",
  "hsn",
  "tsn",
  "displacement_ccm",
  "co2_combined",
  "emission_class",
  "weight_empty",
  "weight_max",
  "zb2_number",
  "next_hu",
] as const;

// Claude-Vision unterstützt diese Medientypen direkt.
const MEDIA: Record<string, "application/pdf" | "image/jpeg" | "image/png" | "image/webp"> = {
  "application/pdf": "application/pdf",
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

const str = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v).trim();
};

/**
 * Liest einen Fahrzeugschein (Zulassungsbescheinigung Teil I) per KI aus und
 * gibt formularfertige Felder zurück. Es wird NICHTS gespeichert — die Datei
 * wird erst beim Anlegen/Speichern des Fahrzeugs hinterlegt.
 */
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
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
  }
  const mediaType = MEDIA[file.type];
  if (!mediaType) {
    return NextResponse.json(
      { error: "Bitte PDF, JPG, PNG oder WebP hochladen" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseVehicleRegistration(buf.toString("base64"), mediaType);
  } catch (e) {
    // Detail nur ins Server-Log — dem Client keine rohen Modell-/SDK-Strings zeigen.
    console.error("[parse-registration]", e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      {
        error:
          "Fahrzeugschein konnte nicht ausgelesen werden. Bitte ein klareres Foto oder das PDF versuchen.",
      },
      { status: 502 }
    );
  }

  const d = parsed.data;
  // kW -> PS (1 kW ≈ 1,35962 PS), gerundet. Plausibilitäts-Prüfung: ein PKW hat
  // grob 15–700 kW (kleiner Puffer über den 600 kW des Prompts). Liegt der Wert
  // daneben (häufig, weil die KI die kW mit der Nenndrehzahl verschmolzen hat →
  // "1103000"), lieber leer lassen als als riesige PS-Zahl schreiben.
  const kw =
    typeof d.power_kw === "number" && Number.isFinite(d.power_kw) ? d.power_kw : null;
  const powerPs = kw != null && kw >= 15 && kw <= 700 ? String(Math.round(kw * 1.35962)) : "";

  // Formularfertige Felder (alles als String — der Form-State ist string-basiert).
  // Schlüssel entsprechen den VehicleFormState-Keys.
  const fields: Record<string, string> = {
    plate: str(d.plate),
    manufacturer: str(d.manufacturer),
    model: str(d.model),
    fin_number: str(d.vin),
    first_registration: str(d.first_registration),
    color: str(d.color),
    fuel_type: str(d.fuel_type),
    power_ps: powerPs,
    seats: str(d.seats),
    body_type: str(d.body_type),
    hsn: str(d.hsn),
    tsn: str(d.tsn),
    displacement_ccm: str(d.displacement_ccm),
    co2_combined: str(d.co2_combined),
    emission_class: str(d.emission_class),
    weight_empty: str(d.weight_empty),
    weight_max: str(d.weight_max),
    zb2_number: str(d.zb2_number),
    next_hu: str(d.next_hu),
  };

  // ── Gegenprüfung: existiert das Kennzeichen schon? ──
  // Use-Case: Fahrzeug wurde z. B. per CSV angelegt, jetzt kommt der Schein dazu.
  // Dann nicht doppelt anlegen/überschreiben, sondern nur fehlende Felder ergänzen.
  let existing: {
    id: string;
    label: string;
    plate: string;
    current: Record<string, string | number | null>;
  } | null = null;

  const plate = normalizePlate(fields.plate);
  if (plate) {
    const admin = createAdminClient();
    const { data: hit } = await admin
      .from("vehicles")
      .select("*")
      .eq("org_id", profile.org_id)
      .eq("plate", plate)
      .maybeSingle();
    if (hit) {
      const row = hit as unknown as Record<string, string | number | null>;
      const current: Record<string, string | number | null> = {};
      for (const c of PARSE_COLUMNS) current[c] = row[c] ?? null;
      existing = {
        id: String(row.id),
        plate: String(row.plate),
        label:
          (row.vehicle_type as string) ||
          buildVehicleType(row.manufacturer as string, row.model as string) ||
          String(row.plate),
        current,
      };
    }
  }

  return NextResponse.json({
    ok: true,
    fields,
    registration_data: d, // vollständiger Auslese-Datensatz für die Speicherung
    confidence: typeof d.confidence === "number" ? d.confidence : null,
    existing, // null = neues Fahrzeug; sonst Treffer zum Ergänzen
  });
};
