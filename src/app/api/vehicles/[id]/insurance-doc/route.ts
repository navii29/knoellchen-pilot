import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const BUCKET = "vehicle-documents";

// Slot -> Spalte am Fahrzeug.
const SLOTS = {
  policy: "insurance_policy_path",
  card: "insurance_card_path",
} as const;
type Slot = keyof typeof SLOTS;

const slotFromReq = (req: Request): Slot | null => {
  const s = new URL(req.url).searchParams.get("slot");
  return s === "policy" || s === "card" ? s : null;
};

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
    .select("id, insurance_policy_path, insurance_card_path")
    .eq("id", vehicleId)
    .eq("org_id", orgId)
    .maybeSingle();
  return data as
    | { id: string; insurance_policy_path: string | null; insurance_card_path: string | null }
    | null;
};

// Allow-list erwarteter Dokumentformate — kein SVG/HTML (Stored-XSS-Vektor).
const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** Versicherungs-Dokument (Police oder Karte) hochladen — ersetzt ein vorhandenes. */
export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const slot = slotFromReq(req);
  if (!slot) return NextResponse.json({ error: "Ungültiger Slot" }, { status: 400 });

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
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Ungültiger Dateityp (erlaubt: PDF, JPG, PNG, WebP, HEIC)" },
      { status: 400 }
    );
  }

  const column = SLOTS[slot];
  const admin = createAdminClient();
  const path = `${auth.org_id}/${params.id}/versicherung-${slot}-${Date.now().toString(36)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const prev = vehicle[column];
  if (prev) await admin.storage.from(BUCKET).remove([prev]);

  const { error: dbErr } = await admin
    .from("vehicles")
    .update({ [column]: path, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, slot, path });
};

/** Versicherungs-Dokument ansehen/drucken — 302 auf signierte URL. */
export const GET = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const slot = slotFromReq(req);
  if (!slot) return NextResponse.json({ error: "Ungültiger Slot" }, { status: 400 });

  const vehicle = await loadVehicle(auth.org_id, params.id);
  const path = vehicle?.[SLOTS[slot]];
  if (!path) return NextResponse.json({ error: "Kein Dokument hinterlegt" }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 5);
  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? "Signierung fehlgeschlagen" },
      { status: 500 }
    );
  }
  return NextResponse.redirect(data.signedUrl, { status: 302 });
};

/** Versicherungs-Dokument entfernen. */
export const DELETE = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const slot = slotFromReq(req);
  if (!slot) return NextResponse.json({ error: "Ungültiger Slot" }, { status: 400 });

  const vehicle = await loadVehicle(auth.org_id, params.id);
  if (!vehicle) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const column = SLOTS[slot];
  const admin = createAdminClient();
  const prev = vehicle[column];
  if (prev) await admin.storage.from(BUCKET).remove([prev]);

  const { error } = await admin
    .from("vehicles")
    .update({ [column]: null, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, slot });
};
