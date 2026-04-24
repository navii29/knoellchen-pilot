import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { HandoverPhotoType, HandoverPosition } from "@/lib/types";

export const maxDuration = 30;

const VALID_POSITIONS: ReadonlyArray<HandoverPosition> = [
  "front",
  "rear",
  "left",
  "right",
  "front_left",
  "front_right",
  "rear_left",
  "rear_right",
  "interior",
  "dashboard",
];

const VALID_TYPES: ReadonlyArray<HandoverPhotoType> = ["pickup", "return"];

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

export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const type = String(form.get("type") || "");
  const position = String(form.get("position") || "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datei fehlt" }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type as HandoverPhotoType)) {
    return NextResponse.json({ error: "Ungültiger Typ" }, { status: 400 });
  }
  if (!VALID_POSITIONS.includes(position as HandoverPosition)) {
    return NextResponse.json({ error: "Ungültige Position" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Datei zu groß (max 12 MB)" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Vertrag muss zur Org gehören
  const { data: contract } = await admin
    .from("contracts")
    .select("id, org_id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const stamp = Date.now().toString(36);
  const path = `${auth.org_id}/${params.id}/${type}/${position}-${stamp}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);

  const { error: upErr } = await admin.storage
    .from("handover-photos")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Vorhandenes Foto für (contract, type, position) ersetzen — alte Datei löschen
  const { data: existing } = await admin
    .from("handover_photos")
    .select("id, photo_path")
    .eq("contract_id", params.id)
    .eq("type", type)
    .eq("position", position)
    .maybeSingle();

  if (existing) {
    await admin.storage.from("handover-photos").remove([existing.photo_path]);
    await admin.from("handover_photos").delete().eq("id", existing.id);
  }

  const { data, error } = await admin
    .from("handover_photos")
    .insert({
      contract_id: params.id,
      org_id: auth.org_id,
      type,
      position,
      photo_path: path,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, photo: data });
};
