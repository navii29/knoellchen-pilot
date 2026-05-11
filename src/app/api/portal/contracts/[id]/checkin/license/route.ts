import { NextResponse } from "next/server";
import { loadPortalContract } from "@/lib/portal-contract-guard";
import { parseCustomerDocument } from "@/lib/anthropic";

export const maxDuration = 60;

type Ctx = { params: { id: string } };

export const POST = async (req: Request, { params }: Ctx) => {
  const ctx = await loadPortalContract(params.id);
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024)
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const stamp = Date.now().toString(36);
  const path = `${ctx.session.org_id}/portal/${ctx.session.customer_id}/license-${stamp}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await ctx.admin.storage
    .from("customer-documents")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const mediaType =
    ext === "pdf"
      ? "application/pdf"
      : ext === "png"
      ? "image/png"
      : ext === "webp"
      ? "image/webp"
      : "image/jpeg";

  let parsed;
  try {
    parsed = await parseCustomerDocument(
      buf.toString("base64"),
      mediaType as "image/jpeg" | "image/png" | "image/webp" | "application/pdf"
    );
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

  const fillIfEmpty = (key: keyof typeof parsed.data, current: unknown) => {
    const v = parsed.data[key];
    if (typeof v !== "string" || !v.trim()) return null;
    return current == null || current === "" ? v : null;
  };

  const updates: Record<string, unknown> = {
    license_photo_path: path,
  };
  for (const k of [
    "first_name",
    "last_name",
    "birthday",
    "license_nr",
    "license_class",
    "license_expiry",
  ] as const) {
    const v = fillIfEmpty(k, customer?.[k]);
    if (v != null) updates[k] = v;
  }

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
