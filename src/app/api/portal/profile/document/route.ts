import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { parseCustomerDocument } from "@/lib/anthropic";

export const maxDuration = 60;

// Felder, die je Dokumenttyp aus dem OCR-Ergebnis in die leeren Customer-Felder
// übernommen werden — identisch zu den Check-in-Routen, nur ohne Vertrag.
const FILL_KEYS = {
  license: [
    "first_name",
    "last_name",
    "birthday",
    "license_nr",
    "license_class",
    "license_expiry",
  ],
  id_card: ["first_name", "last_name", "id_card_nr", "street", "house_nr", "zip", "city"],
} as const;

export const POST = async (req: Request) => {
  // Portal-Session (JWT + lebende portal_sessions-Zeile) — KEIN Vertrag nötig.
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const docType = url.searchParams.get("doc_type");
  if (docType !== "license" && docType !== "id_card")
    return NextResponse.json({ error: "Ungültiger doc_type" }, { status: 400 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024)
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const stamp = Date.now().toString(36);
  // Org-präfixierter Pfad, strikt auf die eigene Session gescoped.
  const path = `${session.org_id}/${session.customer_id}/profile/${docType}-${stamp}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
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

  // Customer-Felder NUR dort ergänzen, wo bisher leer — nie überschreiben, was
  // der Betreiber bereits eingetragen hat.
  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("id", session.customer_id)
    .eq("org_id", session.org_id)
    .single();

  const fillIfEmpty = (key: keyof typeof parsed.data, current: unknown) => {
    const v = parsed.data[key];
    if (typeof v !== "string" || !v.trim()) return null;
    return current == null || current === "" ? v : null;
  };

  const updates: Record<string, unknown> = {
    [docType === "license" ? "license_photo_path" : "id_card_photo_path"]: path,
  };
  for (const k of FILL_KEYS[docType]) {
    const v = fillIfEmpty(k, customer?.[k]);
    if (v != null) updates[k] = v;
  }

  await admin
    .from("customers")
    .update(updates)
    .eq("id", session.customer_id)
    .eq("org_id", session.org_id);

  const data = {
    first_name: parsed.data.first_name ?? null,
    last_name: parsed.data.last_name ?? null,
    birthday: parsed.data.birthday ?? null,
    street: parsed.data.street ?? null,
    house_nr: parsed.data.house_nr ?? null,
    zip: parsed.data.zip ?? null,
    city: parsed.data.city ?? null,
    license_nr: parsed.data.license_nr ?? null,
    license_class: parsed.data.license_class ?? null,
    license_expiry: parsed.data.license_expiry ?? null,
    id_card_nr: parsed.data.id_card_nr ?? null,
    confidence: parsed.data.confidence ?? null,
  };

  // `parsed` für DocScanStep (liest j.parsed), `data` zusätzlich wie spezifiziert.
  return NextResponse.json({ ok: true, parsed: data, data, storage_path: path });
};
