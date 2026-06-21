import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const BUCKET = "vehicle-documents";

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

type Ctx = { params: { id: string } };

const loadVehicle = async (orgId: string, vehicleId: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vehicles")
    .select("id, registration_doc_path")
    .eq("id", vehicleId)
    .eq("org_id", orgId)
    .maybeSingle();
  return data as { id: string; registration_doc_path: string | null } | null;
};

/** Fahrzeugschein hochladen (ersetzt einen vorhandenen). */
export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const vehicle = await loadVehicle(auth.org_id, params.id);
  if (!vehicle) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
  }
  // Allow-list erwarteter Dokumentformate — kein SVG/HTML (Stored-XSS-Vektor).
  const ALLOWED: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Ungültiger Dateityp (erlaubt: PDF, JPG, PNG, WebP, HEIC, HEIF)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const path = `${auth.org_id}/${params.id}/fahrzeugschein-${Date.now().toString(36)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Alten Schein entfernen, dann Pfad am Fahrzeug speichern.
  if (vehicle.registration_doc_path) {
    await admin.storage.from(BUCKET).remove([vehicle.registration_doc_path]);
  }
  const { error: dbErr } = await admin
    .from("vehicles")
    .update({ registration_doc_path: path, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, registration_doc_path: path });
};

/** Fahrzeugschein ansehen — 302 auf signierte URL. */
export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const vehicle = await loadVehicle(auth.org_id, params.id);
  if (!vehicle?.registration_doc_path) {
    return NextResponse.json({ error: "Kein Fahrzeugschein hinterlegt" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(vehicle.registration_doc_path, 60 * 5);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Signierung fehlgeschlagen" },
      { status: 500 }
    );
  }
  return NextResponse.redirect(data.signedUrl, { status: 302 });
};

/** Fahrzeugschein entfernen. */
export const DELETE = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const vehicle = await loadVehicle(auth.org_id, params.id);
  if (!vehicle) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const admin = createAdminClient();
  if (vehicle.registration_doc_path) {
    await admin.storage.from(BUCKET).remove([vehicle.registration_doc_path]);
  }
  const { error } = await admin
    .from("vehicles")
    .update({ registration_doc_path: null, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
