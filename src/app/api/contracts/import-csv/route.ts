import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  CONTRACT_FIELDS,
  applyMapping,
  parseCsvText,
  type ColumnMapping,
} from "@/lib/csv-import";
import { decodeCsvFile } from "@/lib/encoding";
import { mapCsvColumns } from "@/lib/anthropic";
import { normalizePlate } from "@/lib/plate";
import { nextContractNr } from "@/lib/contract-utils";
import { requirePermission } from "@/lib/team";
import { applyTakeover } from "@/lib/contract-takeover-service";

export const maxDuration = 60;

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
  return profile ? { user, org_id: profile.org_id as string } : null;
};

const ALLOWED_KEYS = new Set(CONTRACT_FIELDS.map((f) => f.key));

// Harte Limits für die Commit-Phase: csv_text kommt als JSON-Body ohne
// Größenbegrenzung herein und wird zeilenweise (seriell, mit Retry) eingefügt.
// Eine riesige Datei würde maxDuration (60 s) sprengen und nur teilweise
// importieren. Lieber sauber ablehnen als halb importieren.
const MAX_ROWS = 5000;
const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gate = await requirePermission("import_export");
  if (!gate.ok) return gate.res;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "analyze";

  if (action === "analyze") {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: "Datei zu groß (max 5 MB)" }, { status: 400 });

    const text = await decodeCsvFile(file);
    const parsed = parseCsvText(text);
    if (parsed.headers.length === 0 || parsed.rowCount === 0)
      return NextResponse.json(
        { error: "CSV ist leer oder konnte nicht gelesen werden." },
        { status: 400 }
      );

    let aiMapping;
    try {
      aiMapping = await mapCsvColumns({
        headers: parsed.headers,
        sampleRows: parsed.rows.slice(0, 5),
        targetFields: CONTRACT_FIELDS,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: `Software-Mapping fehlgeschlagen: ${msg}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      headers: parsed.headers,
      sample_rows: parsed.rows.slice(0, 5),
      total_rows: parsed.rowCount,
      mapping: aiMapping.mapping,
      reasoning: aiMapping.reasoning,
      target_fields: CONTRACT_FIELDS,
    });
  }

  if (action === "commit") {
    const body = (await req.json().catch(() => ({}))) as {
      csv_text?: string;
      mapping?: ColumnMapping;
    };
    const csv = body.csv_text;
    const mapping = body.mapping;
    if (typeof csv !== "string" || !mapping || typeof mapping !== "object")
      return NextResponse.json(
        { error: "csv_text und mapping erforderlich" },
        { status: 400 }
      );

    // Roh-Größe begrenzen, bevor überhaupt geparst wird (DoS/Timeout-Schutz).
    if (Buffer.byteLength(csv, "utf8") > MAX_CSV_BYTES)
      return NextResponse.json(
        { error: "CSV zu groß (max 5 MB). Bitte in kleineren Dateien importieren." },
        { status: 413 }
      );

    const cleanMapping: ColumnMapping = {};
    for (const [k, v] of Object.entries(mapping)) {
      cleanMapping[k] = v && ALLOWED_KEYS.has(v) ? v : null;
    }

    const parsed = parseCsvText(csv);

    // Zeilenlimit erzwingen — seriell mit Retry eingefügt; tausende Zeilen
    // sprengen maxDuration und führen zu Teilimporten.
    if (parsed.rowCount > MAX_ROWS)
      return NextResponse.json(
        {
          error: `Zu viele Zeilen (${parsed.rowCount}). Maximal ${MAX_ROWS} pro Import. Bitte die Datei aufteilen.`,
        },
        { status: 413 }
      );
    const admin = createAdminClient();

    type Row = { row_index: number; ok: boolean; error?: string };
    const results: Row[] = [];
    const resultByRow = new Map<number, Row>();
    type Candidate = { rowIndex: number; mapped: Record<string, unknown>; plate: string };
    const candidates: Candidate[] = [];

    parsed.rows.forEach((raw, i) => {
      const r: Row = { row_index: i + 1, ok: true };
      results.push(r);
      resultByRow.set(i + 1, r);
      const mapped = applyMapping(raw, cleanMapping);
      const plate = normalizePlate(String(mapped.plate ?? ""));
      const renter = String(mapped.renter_name ?? "").trim();
      const pickup = String(mapped.pickup_date ?? "").trim();
      const ret = String(mapped.return_date ?? "").trim();
      if (!plate) {
        r.ok = false;
        r.error = "Pflichtfeld 'Kennzeichen' fehlt oder ungültig";
        return;
      }
      if (!renter) {
        r.ok = false;
        r.error = "Pflichtfeld 'Mietername' fehlt";
        return;
      }
      if (!pickup || !ret) {
        r.ok = false;
        r.error = "Abhol- oder Rückgabedatum fehlt/ungültig";
        return;
      }
      if (ret < pickup) {
        r.ok = false;
        r.error = "Rückgabedatum liegt vor dem Abholdatum";
        return;
      }
      mapped.plate = plate;
      candidates.push({ rowIndex: i + 1, mapped, plate });
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        skipped: results.filter((x) => !x.ok).length,
        results,
      });
    }

    // Fahrzeuge der referenzierten Kennzeichen sicherstellen (org-scoped), damit
    // die Verträge eine vehicle_id bekommen — ohne Vorhandenes zu überschreiben.
    const uniquePlates = [...new Set(candidates.map((c) => c.plate))];
    const { error: vUpsertErr } = await admin.from("vehicles").upsert(
      uniquePlates.map((plate) => ({ org_id: auth.org_id, plate })),
      { onConflict: "org_id,plate", ignoreDuplicates: true }
    );
    if (vUpsertErr)
      console.error(
        "[import-csv] vehicles.upsert fehlgeschlagen (" + uniquePlates.length + " Kennzeichen):",
        vUpsertErr.code ?? "",
        vUpsertErr.message
      );
    const { data: vehicleRows } = await admin
      .from("vehicles")
      .select("id, plate")
      .eq("org_id", auth.org_id)
      .in("plate", uniquePlates);
    const plateToId = new Map<string, string>();
    for (const v of (vehicleRows ?? []) as { id: string; plate: string }[]) {
      plateToId.set(v.plate, v.id);
    }

    let inserted = 0;
    const insertedIds: string[] = [];
    for (const c of candidates) {
      const m = c.mapped;
      const providedNr = String(m.contract_nr ?? "").trim();
      const baseRow: Record<string, unknown> = {
        org_id: auth.org_id,
        vehicle_id: plateToId.get(c.plate) ?? null,
        plate: c.plate,
        vehicle_type: m.vehicle_type ?? null,
        renter_name: String(m.renter_name).trim(),
        renter_email: m.renter_email ?? null,
        renter_phone: m.renter_phone ?? null,
        renter_address: m.renter_address ?? null,
        renter_birthday: m.renter_birthday ?? null,
        renter_license_nr: m.renter_license_nr ?? null,
        renter_license_class: m.renter_license_class ?? null,
        renter_license_expiry: m.renter_license_expiry ?? null,
        pickup_date: m.pickup_date,
        return_date: m.return_date,
        original_return_date: m.return_date,
        pickup_time: m.pickup_time ?? null,
        return_time: m.return_time ?? null,
        daily_rate: m.daily_rate ?? null,
        total_amount: m.total_amount ?? null,
        deposit: m.deposit ?? null,
        km_pickup: m.km_pickup ?? null,
        km_return: m.km_return ?? null,
        km_limit: m.km_limit ?? null,
        renter_birthplace: m.renter_birthplace ?? null,
        renter_id_card_nr: m.renter_id_card_nr ?? null,
        renter_id_card_authority: m.renter_id_card_authority ?? null,
        renter_license_issued: m.renter_license_issued ?? null,
        renter_iban: m.renter_iban ?? null,
        renter_bank_holder: m.renter_bank_holder ?? null,
        vehicle_color: m.vehicle_color ?? null,
        vehicle_fin: m.vehicle_fin ?? null,
        weekly_rate: m.weekly_rate ?? null,
        monthly_rate: m.monthly_rate ?? null,
        status: typeof m.status === "string" && m.status.trim() ? m.status : "aktiv",
        notes: m.notes ?? null,
      };

      // Insert mit Retry: nur bei automatisch vergebener Vertragsnummer eine neue
      // ziehen, falls UNIQUE(org_id, contract_nr) kollidiert.
      let ok = false;
      let lastErr = "";
      let newId: string | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const row = { ...baseRow, contract_nr: providedNr || nextContractNr() };
        const res = await admin.from("contracts").insert(row).select("id").single();
        if (!res.error) {
          ok = true;
          newId = (res.data as { id: string } | null)?.id ?? null;
          break;
        }
        lastErr = res.error.message;
        if (res.error.code !== "23505" || providedNr) break;
      }
      if (ok) {
        inserted++;
        if (newId) insertedIds.push(newId);
      } else {
        const r = resultByRow.get(c.rowIndex);
        if (r) {
          r.ok = false;
          r.error = `DB: ${lastErr}`;
        }
      }
    }

    // Kunden & Fahrzeuge aus den importierten Verträgen anlegen/abgleichen.
    // Fehler hier kippen den erfolgreichen Vertrags-Import NICHT — werden aber
    // jetzt sichtbar (customers_step_ok), statt still zu verschwinden.
    let customersCreated = 0;
    let customersStepOk = true;
    try {
      const tk = await applyTakeover(admin, auth.org_id, insertedIds);
      customersCreated = tk.customersCreated;
      customersStepOk = !tk.loadFailed;
    } catch (e) {
      console.error("applyTakeover (import-csv) fehlgeschlagen:", e);
      customersStepOk = false;
    }

    return NextResponse.json({
      ok: true,
      inserted,
      customers_created: customersCreated,
      customers_step_ok: customersStepOk,
      skipped: results.filter((x) => !x.ok).length,
      results,
    });
  }

  return NextResponse.json({ error: "Unbekannte action" }, { status: 400 });
};
