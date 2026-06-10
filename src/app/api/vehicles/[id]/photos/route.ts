import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const BUCKET = "vehicle-photos";

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

/** Fotos eines Fahrzeugs auflisten — inkl. signierter Vorschau-URLs (1 h). */
export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: photos, error } = await admin
    .from("vehicle_photos")
    .select("id, photo_path, created_at")
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await admin.storage.from(BUCKET).createSignedUrl(p.photo_path, 60 * 60);
      return { id: p.id, created_at: p.created_at, url: data?.signedUrl ?? null };
    })
  );
  return NextResponse.json({ photos: result });
};

/** Ein oder mehrere Fotos hochladen (multipart, Feldname "file"). */
export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!vehicle) return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });

  const created: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: `Kein Bild: ${file.name}` }, { status: 400 });
    }
    if (file.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: `Datei zu groß (max 12 MB): ${file.name}` }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${auth.org_id}/${params.id}/${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buf, { contentType: file.type, upsert: false });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { error: dbErr } = await admin.from("vehicle_photos").insert({
      vehicle_id: params.id,
      org_id: auth.org_id,
      photo_path: path,
    });
    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });
    created.push(path);
  }

  return NextResponse.json({ ok: true, count: created.length });
};
