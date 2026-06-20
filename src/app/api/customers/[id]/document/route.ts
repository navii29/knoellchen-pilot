import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Upload/Ersetzen/Entfernen der Kunden-Dokumentfotos (Führerschein, Ausweis).
// Der Storage-Pfad wird hier serverseitig & org-scoped vergeben — der Client
// liefert NUR die Datei + den Typ, nie einen Pfad. So kann kein manipulierter
// Pfad fremde Dokumente referenzieren (vgl. generischer PATCH ohne Pfad-Felder).
const BUCKET = "customer-documents";

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

const parseType = (v: unknown): DocType | null =>
  v === "license" || v === "id_card" ? v : null;

const loadCustomer = async (orgId: string, id: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("customers")
    .select("id, license_photo_path, id_card_photo_path")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();
  return data as
    | { id: string; license_photo_path: string | null; id_card_photo_path: string | null }
    | null;
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

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const customer = await loadCustomer(auth.org_id, params.id);
  if (!customer) return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });

  const form = await req.formData();
  const type = parseType(form.get("type"));
  if (!type) return NextResponse.json({ error: "Ungültiger Dokumenttyp" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Ungültiger Dateityp (erlaubt: PDF, JPG, PNG, WebP, HEIC)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const column = COLUMN[type];
  const path = `${auth.org_id}/${params.id}/${type}-${Date.now().toString(36)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const oldPath = customer[column];
  if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]);

  const { error: dbErr } = await admin
    .from("customers")
    .update({ [column]: path })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, path });
};

export const DELETE = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const type = parseType(new URL(req.url).searchParams.get("type"));
  if (!type) return NextResponse.json({ error: "Ungültiger Dokumenttyp" }, { status: 400 });

  const customer = await loadCustomer(auth.org_id, params.id);
  if (!customer) return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });

  const admin = createAdminClient();
  const column = COLUMN[type];
  const oldPath = customer[column];
  if (oldPath) await admin.storage.from(BUCKET).remove([oldPath]);

  const { error } = await admin
    .from("customers")
    .update({ [column]: null })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
