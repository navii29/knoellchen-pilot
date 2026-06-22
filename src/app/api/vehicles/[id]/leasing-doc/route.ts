import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ownerOnly } from "@/lib/team";

const BUCKET = "vehicle-documents";

const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

type Ctx = { params: { id: string } };

const loadVehicle = async (orgId: string, vehicleId: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vehicles")
    .select("id, leasing_doc_path")
    .eq("id", vehicleId)
    .eq("org_id", orgId)
    .maybeSingle();
  return data as { id: string; leasing_doc_path: string | null } | null;
};

/** Leasingvertrag hochladen (ersetzt einen vorhandenen) — nur Inhaber. */
export const POST = async (req: Request, { params }: Ctx) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;
  const orgId = gate.m.orgId;

  const vehicle = await loadVehicle(orgId, params.id);
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
      { error: "Ungültiger Dateityp (erlaubt: PDF, JPG, PNG, WebP, HEIC, HEIF)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const path = `${orgId}/${params.id}/leasing-${Date.now().toString(36)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  if (vehicle.leasing_doc_path) {
    await admin.storage.from(BUCKET).remove([vehicle.leasing_doc_path]);
  }
  const { error: dbErr } = await admin
    .from("vehicles")
    .update({ leasing_doc_path: path, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("org_id", orgId);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, leasing_doc_path: path });
};

/** Leasingvertrag ansehen — 302 auf signierte URL (nur Inhaber). */
export const GET = async (_req: Request, { params }: Ctx) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;

  const vehicle = await loadVehicle(gate.m.orgId, params.id);
  if (!vehicle?.leasing_doc_path) {
    return NextResponse.json({ error: "Kein Leasingvertrag hinterlegt" }, { status: 404 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(vehicle.leasing_doc_path, 60 * 5);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Signierung fehlgeschlagen" }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl, { status: 302 });
};

/** Leasingvertrag entfernen (nur Inhaber). */
export const DELETE = async (_req: Request, { params }: Ctx) => {
  const gate = await ownerOnly();
  if (!gate.ok) return gate.res;

  const vehicle = await loadVehicle(gate.m.orgId, params.id);
  if (!vehicle) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const admin = createAdminClient();
  if (vehicle.leasing_doc_path) {
    await admin.storage.from(BUCKET).remove([vehicle.leasing_doc_path]);
  }
  const { error } = await admin
    .from("vehicles")
    .update({ leasing_doc_path: null, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("org_id", gate.m.orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
