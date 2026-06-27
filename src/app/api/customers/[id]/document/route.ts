import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { parseCustomerDocument } from "@/lib/anthropic";
import { mergeCustomerDocFields } from "@/lib/customer-docs";

// Upload/Ersetzen/Entfernen der Kunden-Dokumentfotos (Führerschein, Ausweis).
// Je Dokument werden Vorder- UND Rückseite gespeichert; beide Seiten werden
// ZUSAMMEN per KI ausgelesen und die leeren Customer-Felder befüllt (fill-if-
// empty). Der Storage-Pfad wird hier serverseitig & org-scoped vergeben — der
// Client liefert NUR die Dateien + den Typ, nie einen Pfad. So kann kein
// manipulierter Pfad fremde Dokumente referenzieren.
const BUCKET = "customer-documents";

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

type Ctx = { params: { id: string } };
type DocType = "license" | "id_card";

const COLUMN: Record<DocType, "license_photo_path" | "id_card_photo_path"> = {
  license: "license_photo_path",
  id_card: "id_card_photo_path",
};
const COLUMN_BACK: Record<DocType, "license_photo_back_path" | "id_card_photo_back_path"> = {
  license: "license_photo_back_path",
  id_card: "id_card_photo_back_path",
};

const parseType = (v: unknown): DocType | null =>
  v === "license" || v === "id_card" ? v : null;

type CustomerDoc = {
  id: string;
  license_photo_path: string | null;
  id_card_photo_path: string | null;
  license_photo_back_path: string | null;
  id_card_photo_back_path: string | null;
};

const loadCustomer = async (orgId: string, id: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select(
      "id, license_photo_path, id_card_photo_path, license_photo_back_path, id_card_photo_back_path"
    )
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  return data as CustomerDoc | null;
};

// Allow-list erwarteter Formate — kein SVG/HTML (Stored-XSS-Vektor).
const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

// Storage-Endung -> Claude-Vision-MediaType. HEIC/HEIF kann die Vision-API nicht
// lesen — solche Bilder werden zwar gespeichert, aber beim OCR übersprungen.
const VISION_MEDIA: Record<string, "image/jpeg" | "image/png" | "image/webp" | "application/pdf"> =
  {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

const validateFile = (file: unknown): { ok: true; file: File; ext: string } | { ok: false; error: string } => {
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "Keine Datei übermittelt" };
  if (file.size > 12 * 1024 * 1024)
    return { ok: false, error: "Datei zu groß (max 12 MB)" };
  const ext = ALLOWED[file.type];
  if (!ext)
    return { ok: false, error: "Ungültiger Dateityp (erlaubt: PDF, JPG, PNG, WebP, HEIC)" };
  return { ok: true, file, ext };
};

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const customer = await loadCustomer(auth.org_id, params.id);
  if (!customer) return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });

  const form = await req.formData();
  const type = parseType(form.get("type"));
  if (!type) return NextResponse.json({ error: "Ungültiger Dokumenttyp" }, { status: 400 });

  // Vorderseite: bevorzugt `file_front`, alternativ Legacy-`file`. Rückseite optional.
  const frontRaw = form.get("file_front") ?? form.get("file");
  const frontCheck = validateFile(frontRaw);
  if (!frontCheck.ok) return NextResponse.json({ error: frontCheck.error }, { status: 400 });

  const backRaw = form.get("file_back");
  let back: { file: File; ext: string } | null = null;
  if (backRaw != null && backRaw !== "") {
    const backCheck = validateFile(backRaw);
    if (!backCheck.ok) return NextResponse.json({ error: backCheck.error }, { status: 400 });
    back = { file: backCheck.file, ext: backCheck.ext };
  }

  const admin = createAdminClient();
  const stamp = Date.now().toString(36);
  const frontBuf = Buffer.from(await frontCheck.file.arrayBuffer());
  const frontPath = `${auth.org_id}/${params.id}/${type}-front-${stamp}.${frontCheck.ext}`;
  const { error: upFrontErr } = await admin.storage
    .from(BUCKET)
    .upload(frontPath, frontBuf, { contentType: frontCheck.file.type, upsert: true });
  if (upFrontErr) return NextResponse.json({ error: upFrontErr.message }, { status: 500 });

  let backBuf: Buffer | null = null;
  let backPath: string | null = null;
  if (back) {
    backBuf = Buffer.from(await back.file.arrayBuffer());
    backPath = `${auth.org_id}/${params.id}/${type}-back-${stamp}.${back.ext}`;
    const { error: upBackErr } = await admin.storage
      .from(BUCKET)
      .upload(backPath, backBuf, { contentType: back.file.type, upsert: true });
    if (upBackErr) return NextResponse.json({ error: upBackErr.message }, { status: 500 });
  }

  // Alte Dateien entfernen, die die neuen ersetzen. Die Rückseite wird nur
  // ersetzt (alte entfernt), wenn jetzt eine neue Rückseite hochgeladen wurde.
  const oldFront = customer[COLUMN[type]];
  if (oldFront && oldFront !== frontPath) await admin.storage.from(BUCKET).remove([oldFront]);
  if (back) {
    const oldBack = customer[COLUMN_BACK[type]];
    if (oldBack && oldBack !== backPath) await admin.storage.from(BUCKET).remove([oldBack]);
  }

  const photoUpdate: Record<string, unknown> = { [COLUMN[type]]: frontPath };
  if (back) photoUpdate[COLUMN_BACK[type]] = backPath;

  // OCR: Vorder- (+Rück-)seite ZUSAMMEN auslesen. Best-effort — schlägt es fehl,
  // bleiben die Fotos gespeichert und wir geben ok mit filled:[] + ocr_error.
  let filled: string[] = [];
  let ocrError = false;
  const images: Array<{
    base64: string;
    mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  }> = [];
  const frontMedia = VISION_MEDIA[frontCheck.ext];
  if (frontMedia) images.push({ base64: frontBuf.toString("base64"), mediaType: frontMedia });
  if (back && backBuf) {
    const backMedia = VISION_MEDIA[back.ext];
    if (backMedia) images.push({ base64: backBuf.toString("base64"), mediaType: backMedia });
  }

  if (images.length > 0) {
    try {
      const parsed = await parseCustomerDocument(images);
      const { data: full } = await admin
        .from("customers")
        .select("*")
        .eq("id", params.id)
        .eq("org_id", auth.org_id)
        .maybeSingle();
      const { patch, filled: f } = mergeCustomerDocFields(
        full as Record<string, unknown> | null,
        parsed.data,
        type
      );
      filled = f;
      if (Object.keys(patch).length > 0) {
        const { error: patchErr } = await admin
          .from("customers")
          .update(patch)
          .eq("id", params.id)
          .eq("org_id", auth.org_id);
        if (patchErr) {
          ocrError = true;
          // NUR Fehler-Code + betroffene Spalten-NAMEN loggen — niemals
          // patchErr.message, da diese den Feldwert (z. B. ein Datum) und damit
          // Ausweis-/FS-PII spiegeln kann (DSGVO). Code (SQLSTATE) + Felder
          // reichen zur Diagnose.
          console.error(
            "[customer-doc] customers.update fehlgeschlagen (customer_id=" +
              params.id +
              ", felder=" +
              Object.keys(patch).join(",") +
              "):",
            patchErr.code ?? ""
          );
        }
      }
    } catch {
      ocrError = true;
    }
  }

  // Fotopfade IMMER schreiben — auch wenn das OCR scheitert, sollen die Fotos
  // gespeichert bleiben.
  const { error: dbErr } = await admin
    .from("customers")
    .update(photoUpdate)
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, filled, ocr_error: ocrError });
};

export const DELETE = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const type = parseType(new URL(req.url).searchParams.get("type"));
  if (!type) return NextResponse.json({ error: "Ungültiger Dokumenttyp" }, { status: 400 });

  const customer = await loadCustomer(auth.org_id, params.id);
  if (!customer) return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });

  const admin = createAdminClient();
  const toRemove = [customer[COLUMN[type]], customer[COLUMN_BACK[type]]].filter(
    (p): p is string => !!p
  );
  if (toRemove.length) await admin.storage.from(BUCKET).remove(toRemove);

  const { error } = await admin
    .from("customers")
    .update({ [COLUMN[type]]: null, [COLUMN_BACK[type]]: null })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
