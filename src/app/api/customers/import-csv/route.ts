import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  CUSTOMER_FIELDS,
  applyMapping,
  parseCsvText,
  type ColumnMapping,
} from "@/lib/csv-import";
import { resolveCustomerNaming } from "@/lib/customer";
import { decodeCsvFile } from "@/lib/encoding";
import { mapCsvColumns } from "@/lib/anthropic";
import { normalizePlate } from "@/lib/plate";

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

const ALLOWED_KEYS = new Set(CUSTOMER_FIELDS.map((f) => f.key));

void normalizePlate; // not used here, only in vehicles route

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

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
        targetFields: CUSTOMER_FIELDS,
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
      target_fields: CUSTOMER_FIELDS,
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

    // Mapping-Werte validieren — nur gültige Feldkeys erlauben
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
      // Privat braucht Nachname, Firma braucht Firmenname (wird automatisch
      // erkannt, wenn eine Firmenname-Spalte gemappt ist).
      const naming = resolveCustomerNaming(mapped);
      if ("error" in naming) {
        results.push({ row_index: i + 1, ok: false, error: naming.error });
        return;
      }
      insertRows.push({
        ...mapped,
        customer_type: naming.customer_type,
        company_name: naming.company_name,
        legal_form: naming.legal_form,
        last_name: naming.last_name,
        first_name: naming.customer_type === "firma" ? null : mapped.first_name ?? null,
        org_id: auth.org_id,
      });
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

    const { error, data } = await admin
      .from("customers")
      .insert(insertRows)
      .select("id");

    if (error) {
      return NextResponse.json(
        { error: `Datenbank-Fehler: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      inserted: data?.length ?? insertRows.length,
      skipped: results.filter((r) => !r.ok).length,
      results,
    });
  }

  return NextResponse.json({ error: "Unbekannte action" }, { status: 400 });
};
