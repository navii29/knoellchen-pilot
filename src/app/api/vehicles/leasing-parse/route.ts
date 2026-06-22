import { NextResponse } from "next/server";
import { ownerOnly } from "@/lib/team";
import { parseLeasingContract } from "@/lib/anthropic";

export const maxDuration = 60;

const MEDIA: Record<string, "application/pdf" | "image/jpeg" | "image/png" | "image/webp"> = {
  "application/pdf": "application/pdf",
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

const num = (v: unknown): string =>
  typeof v === "number" && Number.isFinite(v) ? String(v) : "";

/**
 * Liest einen Leasing-/Finanzierungsvertrag per KI aus und gibt formularfertige
 * Kostenfelder zurück (Monatsrate + einmalige Lieferantenkosten). Nur Inhaber —
 * es sind EK-/Kostendaten. Es wird nichts gespeichert; die Datei wird beim
 * Speichern des Fahrzeugs hinterlegt.
 */
export const POST = async (req: Request) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;

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
    return NextResponse.json({ error: "Bitte PDF, JPG, PNG oder WebP hochladen" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let parsed;
  try {
    parsed = await parseLeasingContract(buf.toString("base64"), mediaType);
  } catch (e) {
    console.error("[leasing-parse]", e instanceof Error ? e.message : String(e));
    return NextResponse.json(
      { error: "Leasingvertrag konnte nicht ausgelesen werden. Bitte ein klareres PDF/Foto versuchen." },
      { status: 502 }
    );
  }

  const d = parsed.data;
  return NextResponse.json({
    ok: true,
    fields: {
      cost_monthly: num(d.monthly_rate),
      onetime_cost_supplier: num(d.onetime_supplier),
    },
    term_months: d.term_months ?? null,
    lessor: d.lessor ?? null,
    confidence: typeof d.confidence === "number" ? d.confidence : null,
  });
};
