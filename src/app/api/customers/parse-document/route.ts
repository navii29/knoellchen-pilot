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
  const file = form.get("file");
  const docTypeHint = String(form.get("doc_type") || "");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const stamp = Date.now().toString(36);
  const path = `${profile.org_id}/staging/${stamp}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

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
    return NextResponse.json({ error: `Claude Vision fehlgeschlagen: ${msg}` }, { status: 500 });
  }

  const documentType =
    parsed.data.document_type ||
    (docTypeHint === "license" || docTypeHint === "id_card" ? docTypeHint : null);

  return NextResponse.json({
    ok: true,
    data: parsed.data,
    document_type: documentType,
    storage_path: path,
    confidence: parsed.data.confidence ?? 0.9,
  });
};
