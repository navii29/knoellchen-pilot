import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { TirePhotoPosition } from "@/lib/tires";

export const maxDuration = 30;

const VALID_POSITIONS: ReadonlyArray<TirePhotoPosition> = [
  "front_left",
  "front_right",
  "rear_left",
  "rear_right",
  "overview",
  "tread",
];

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

type Ctx = { params: { id: string; tireId: string } };

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const position = String(form.get("position") || "");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  if (!VALID_POSITIONS.includes(position as TirePhotoPosition))
    return NextResponse.json({ error: "Ungültige Position" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024)
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });

  const admin = createAdminClient();

  // Vertikale Berechtigungsprüfung: tire muss zur org und zum vehicle gehören
  const { data: tire } = await admin
    .from("vehicle_tires")
    .select("id, vehicle_id, org_id")
    .eq("id", params.tireId)
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!tire)
    return NextResponse.json({ error: "Reifensatz nicht gefunden" }, { status: 404 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const stamp = Date.now().toString(36);
  const path = `${auth.org_id}/${params.tireId}/${position}-${stamp}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("tire-photos")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Existierendes Foto an gleicher Position ersetzen
  const { data: existing } = await admin
    .from("tire_photos")
    .select("id, photo_path")
    .eq("tire_id", params.tireId)
    .eq("position", position)
    .maybeSingle();

  if (existing) {
    if (existing.photo_path && existing.photo_path !== path) {
      await admin.storage.from("tire-photos").remove([existing.photo_path]);
    }
    await admin
      .from("tire_photos")
      .update({ photo_path: path })
      .eq("id", existing.id);
  } else {
    await admin.from("tire_photos").insert({
      tire_id: params.tireId,
      position,
      photo_path: path,
    });
  }

  return NextResponse.json({ ok: true, position, path });
};

export const DELETE = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const position = url.searchParams.get("position") as TirePhotoPosition | null;
  if (!position || !VALID_POSITIONS.includes(position))
    return NextResponse.json({ error: "Position fehlt" }, { status: 400 });

  const admin = createAdminClient();
  const { data: tire } = await admin
    .from("vehicle_tires")
    .select("id")
    .eq("id", params.tireId)
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!tire)
    return NextResponse.json({ error: "Reifensatz nicht gefunden" }, { status: 404 });

  const { data: existing } = await admin
    .from("tire_photos")
    .select("id, photo_path")
    .eq("tire_id", params.tireId)
    .eq("position", position)
    .maybeSingle();
  if (!existing) return NextResponse.json({ ok: true, removed: false });

  if (existing.photo_path) {
    await admin.storage.from("tire-photos").remove([existing.photo_path]);
  }
  await admin.from("tire_photos").delete().eq("id", existing.id);

  return NextResponse.json({ ok: true, removed: true });
};
