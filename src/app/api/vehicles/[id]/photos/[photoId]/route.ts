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

type Ctx = { params: { id: string; photoId: string } };

/** Foto löschen (Storage + Datensatz). */
export const DELETE = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("vehicle_photos")
    .select("id, photo_path")
    .eq("id", params.photoId)
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!photo) return NextResponse.json({ error: "Foto nicht gefunden" }, { status: 404 });

  await admin.storage.from(BUCKET).remove([photo.photo_path]);
  const { error } = await admin.from("vehicle_photos").delete().eq("id", photo.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
