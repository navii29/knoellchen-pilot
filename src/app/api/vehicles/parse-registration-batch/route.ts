import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { parseVehicleRegistrationsBatch } from "@/lib/anthropic";
import { normalizePlate } from "@/lib/plate";
import { buildVehicleType } from "@/lib/vehicle";
import type { ParsedVehicleRegistration } from "@/lib/types";

export const maxDuration = 120; // mehrere Dokumente nacheinander

const MEDIA: Record<string, "application/pdf" | "image/jpeg" | "image/png" | "image/webp"> = {
  "application/pdf": "application/pdf",
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

const MAX_FILES = 12;

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

const str = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  return String(v).trim();
};

const toFields = (d: ParsedVehicleRegistration): Record<string, string> => {
  // Plausibilitäts-Prüfung: PKW grob 15–700 kW (kleiner Puffer über den 600 kW
  // des Prompts) — implausible Werte lieber leer lassen als als riesige PS-Zahl.
  const kw = typeof d.power_kw === "number" && Number.isFinite(d.power_kw) ? d.power_kw : null;
  const powerPs = kw != null && kw >= 15 && kw <= 700 ? String(Math.round(kw * 1.35962)) : "";
  return {
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
};

/**
 * Stapel-Auslesen: mehrere Dateien (und/oder mehrseitige PDFs) → je Fahrzeugschein
 * ein Datensatz. Pro erkanntem Kennzeichen wird geprüft, ob das Fahrzeug schon
 * existiert (Gegenprüfung). Es wird NICHTS gespeichert — das Anlegen passiert
 * danach pro Eintrag über die normalen Routen.
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
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0)
    return NextResponse.json({ error: "Keine Dateien übermittelt" }, { status: 400 });
  if (files.length > MAX_FILES)
    return NextResponse.json({ error: `Maximal ${MAX_FILES} Dateien auf einmal` }, { status: 400 });

  const admin = createAdminClient();
  const vehicles: unknown[] = [];
  const fileErrors: { file: string; error: string }[] = [];

  for (const file of files) {
    if (file.size > 12 * 1024 * 1024) {
      fileErrors.push({ file: file.name, error: "zu groß (max 12 MB)" });
      continue;
    }
    const mediaType = MEDIA[file.type];
    if (!mediaType) {
      fileErrors.push({ file: file.name, error: "Dateityp nicht unterstützt (PDF/JPG/PNG/WebP)" });
      continue;
    }

    const buf = Buffer.from(await file.arrayBuffer());
    let parsed;
    try {
      parsed = await parseVehicleRegistrationsBatch(buf.toString("base64"), mediaType);
    } catch (e) {
      console.error("[parse-registration-batch]", e instanceof Error ? e.message : String(e));
      fileErrors.push({ file: file.name, error: "Auslesen fehlgeschlagen" });
      continue;
    }

    for (const d of parsed.data) {
      const fields = toFields(d);
      let existing: {
        id: string;
        label: string;
        plate: string;
        current: Record<string, string | number | null>;
      } | null = null;

      const plate = normalizePlate(fields.plate);
      if (plate) {
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

      vehicles.push({
        source_file: file.name,
        fields,
        registration_data: d,
        confidence: typeof d.confidence === "number" ? d.confidence : null,
        existing,
      });
    }
  }

  return NextResponse.json({ ok: true, vehicles, file_errors: fileErrors });
};
