import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { parseCustomerDocument } from "@/lib/anthropic";

export const maxDuration = 60;

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
  const docTypeHint = String(form.get("doc_type") || "");
  // Mehrere Dateien (Vorder- + Rückseite, ggf. weitere) werden GEMEINSAM
  // ausgelesen — Legacy-Single-"file" wird über getAll mit abgedeckt.
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }

  // Allow-list erwarteter Formate (gespiegelt aus customers/[id]/document) — kein
  // SVG/HTML (Stored-XSS) und keine unbekannten Typen. Die Endung wird aus
  // file.type abgeleitet, NICHT aus file.name (manipulierbar). HEIC/HEIF wird
  // gespeichert, aber beim OCR übersprungen.
  const ALLOWED: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  const VISION_MEDIA: Record<
    string,
    "image/jpeg" | "image/png" | "image/webp" | "application/pdf"
  > = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  for (const file of files) {
    if (file.size === 0) {
      return NextResponse.json({ error: "Leere Datei" }, { status: 400 });
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
    }
    if (!ALLOWED[file.type]) {
      return NextResponse.json(
        { error: "Ungültiger Dateityp (erlaubt: PDF, JPG, PNG, WebP, HEIC)" },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();

  const storagePaths: string[] = [];
  const images: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf" }[] = [];
  let i = 0;
  for (const file of files) {
    const ext = ALLOWED[file.type];
    const stamp = `${Date.now().toString(36)}-${i++}`;
    const path = `${profile.org_id}/staging/${stamp}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from("customer-documents")
      .upload(path, buf, { contentType: file.type, upsert: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    storagePaths.push(path);
    // HEIC/HEIF kann die Vision-API nicht lesen — speichern, aber nicht ans OCR.
    const mediaType = VISION_MEDIA[ext];
    if (mediaType) {
      images.push({ base64: buf.toString("base64"), mediaType });
    }
  }

  if (images.length === 0) {
    return NextResponse.json(
      { error: "Format wird vom Auslesen nicht unterstützt (HEIC). Bitte JPG/PNG/PDF." },
      { status: 400 }
    );
  }

  let parsed;
  try {
    parsed = await parseCustomerDocument(images);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Claude Vision fehlgeschlagen: ${msg}` }, { status: 500 });
  }

  const documentType =
    parsed.data.document_type ||
    (docTypeHint === "license" || docTypeHint === "id_card" ? docTypeHint : null);

  return NextResponse.json({
    ok: true,
    data: parsed.data,
    document_type: documentType,
    storage_path: storagePaths[0],
    storage_paths: storagePaths,
    confidence: parsed.data.confidence ?? 0.9,
  });
};
