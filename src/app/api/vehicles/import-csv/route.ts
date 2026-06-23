import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  VEHICLE_FIELDS,
  VEHICLE_COST_KEYS,
  applyMapping,
  parseCsvText,
  type ColumnMapping,
} from "@/lib/csv-import";
import { mapCsvColumns } from "@/lib/anthropic";
import { decodeCsvFile } from "@/lib/encoding";
import { normalizePlate } from "@/lib/plate";
import { myRole, requirePermission } from "@/lib/team";

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
  return profile ? { user, org_id: profile.org_id } : null;
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gate = await requirePermission("import_export");
  if (!gate.ok) return gate.res;

  // Mitarbeiter dürfen keine EK-/Kostenfelder importieren — Zielfelder & erlaubte
  // Schlüssel je nach Rolle einschränken (sonst Lücke in der Margen-Sperre).
  const isOwner = (await myRole()) === "owner";
  const targetFields = isOwner
    ? VEHICLE_FIELDS
    : VEHICLE_FIELDS.filter((f) => !VEHICLE_COST_KEYS.has(f.key));
  const ALLOWED_KEYS = new Set(targetFields.map((f) => f.key));

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
        targetFields,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: `KI-Mapping fehlgeschlagen: ${msg}` },
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
      target_fields: targetFields,
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

    const cleanMapping: ColumnMapping = {};
    for (const [k, v] of Object.entries(mapping)) {
      cleanMapping[k] = v && ALLOWED_KEYS.has(v) ? v : null;
    }

    const parsed = parseCsvText(csv);
    const admin = createAdminClient();

    type Row = { row_index: number; ok: boolean; error?: string };
    const results: Row[] = [];
    const insertRows: Record<string, unknown>[] = [];

    parsed.rows.forEach((raw, i) => {
      const mapped = applyMapping(raw, cleanMapping);
      const plateRaw = String(mapped.plate ?? "");
      const plate = normalizePlate(plateRaw);
      if (!plate) {
        results.push({
          row_index: i + 1,
          ok: false,
          error: "Pflichtfeld 'Kennzeichen' fehlt oder ungültig",
        });
        return;
      }
      mapped.plate = plate;
      insertRows.push({ ...mapped, org_id: auth.org_id, status: "aktiv" });
      results.push({ row_index: i + 1, ok: true });
    });

    if (insertRows.length === 0) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        skipped: results.filter((r) => !r.ok).length,
        results,
      });
    }

    // Dubletten innerhalb der CSV nach plate zusammenführen (letzte Zeile gewinnt).
    // Sonst trifft ON CONFLICT DO UPDATE dieselbe Zielzeile zweimal im selben
    // Statement -> Postgres "cannot affect row a second time" -> ganzer Batch
    // schlägt fehl, obwohl die Per-Zeilen-Ergebnisse ok meldeten.
    const dedupByPlate = new Map<string, Record<string, unknown>>();
    for (const row of insertRows) dedupByPlate.set(String(row.plate), row);
    const uniqueRows = [...dedupByPlate.values()];

    // Upsert per (org_id, plate) — Duplikate werden überschrieben. Bei einem
    // Batch-Fehler (eine fehlerhafte Zeile) zeilenweise nachfassen, damit nicht
    // der ganze Import verloren geht.
    let inserted = 0;
    const bulk = await admin
      .from("vehicles")
      .upsert(uniqueRows, { onConflict: "org_id,plate" })
      .select("id");
    if (!bulk.error) {
      inserted = bulk.data?.length ?? uniqueRows.length;
    } else {
      const failures: string[] = [];
      for (const row of uniqueRows) {
        const one = await admin
          .from("vehicles")
          .upsert(row, { onConflict: "org_id,plate" })
          .select("id")
          .single();
        if (one.error) failures.push(`${row.plate}: ${one.error.message}`);
        else inserted++;
      }
      return NextResponse.json({
        ok: true,
        inserted,
        skipped: results.filter((r) => !r.ok).length,
        failures,
        results,
      });
    }

    return NextResponse.json({
      ok: true,
      inserted,
      skipped: results.filter((r) => !r.ok).length,
      results,
    });
  }

  return NextResponse.json({ error: "Unbekannte action" }, { status: 400 });
};
