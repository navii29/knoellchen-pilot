import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import { parseCustomerDocument } from "@/lib/anthropic";
import { mergeCustomerDocFields } from "@/lib/customer-docs";
import { UploadGuardError, validateUpload } from "@/lib/upload-guard";

export const maxDuration = 60;

type Ctx = { params: { id: string } };

// Storage-Endung -> Claude-Vision-MediaType. HEIC/HEIF kann die Vision-API nicht
// lesen — solche Bilder werden gespeichert, aber beim OCR übersprungen.
const VISION_MEDIA: Record<string, "image/jpeg" | "image/png" | "image/webp" | "application/pdf"> =
  {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

export const POST = async (req: Request, { params }: Ctx) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  let valid;
  try {
    valid = validateUpload(form.get("file"));
  } catch (e) {
    if (e instanceof UploadGuardError)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const { ext, contentType } = valid;

  const stamp = Date.now().toString(36);
  const path = `${ctx.session.org_id}/portal/${ctx.session.customer_id}/license-${stamp}.${ext}`;
  const buf = Buffer.from(await valid.file.arrayBuffer());

  const { error: upErr } = await ctx.admin.storage
    .from("customer-documents")
    .upload(path, buf, { contentType, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const mediaType = VISION_MEDIA[ext];
  if (!mediaType) {
    // HEIC/HEIF: gespeichert, aber kein OCR möglich.
    return NextResponse.json({
      ok: true,
      parsed: null,
      storage_path: path,
    });
  }

  let parsed;
  try {
    parsed = await parseCustomerDocument([
      {
        base64: buf.toString("base64"),
        mediaType,
      },
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Auslesung fehlgeschlagen: ${msg}` }, { status: 500 });
  }

  // Customer-Felder ergänzen, NICHT überschreiben — sondern nur dort schreiben
  // wo bisher leer.
  const { data: customer } = await ctx.admin
    .from("customers")
    .select("*")
    .eq("id", ctx.session.customer_id)
    .eq("org_id", ctx.session.org_id)
    .single();

  // Zentrale, datums-normalisierende Fill-if-empty-Logik (deutsches Datum →
  // ISO), damit FS-Nr/Klassen/Gültigkeit zuverlässig übernommen werden und ein
  // Datumsformat nie das atomare UPDATE kippt.
  const { patch } = mergeCustomerDocFields(
    customer as Record<string, unknown> | null,
    parsed.data,
    "license"
  );
  const updates: Record<string, unknown> = { license_photo_path: path, ...patch };

  await ctx.admin
    .from("customers")
    .update(updates)
    .eq("id", ctx.session.customer_id)
    .eq("org_id", ctx.session.org_id);

  return NextResponse.json({
    ok: true,
    parsed: {
      first_name: parsed.data.first_name ?? null,
      last_name: parsed.data.last_name ?? null,
      birthday: parsed.data.birthday ?? null,
      license_nr: parsed.data.license_nr ?? null,
      license_class: parsed.data.license_class ?? null,
      license_expiry: parsed.data.license_expiry ?? null,
      confidence: parsed.data.confidence ?? null,
    },
    storage_path: path,
  });
};
