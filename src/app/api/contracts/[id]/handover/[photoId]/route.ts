import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

export const DELETE = async (
  _req: Request,
  { params }: { params: { id: string; photoId: string } }
) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  const { data: photo } = await admin
    .from("handover_photos")
    .select("id, photo_path, contract_id")
    .eq("id", params.photoId)
    .eq("org_id", auth.org_id)
    .eq("contract_id", params.id)
    .maybeSingle();

  if (!photo) return NextResponse.json({ error: "Foto nicht gefunden" }, { status: 404 });

  await admin.storage.from("handover-photos").remove([photo.photo_path]);
  const { error } = await admin.from("handover_photos").delete().eq("id", photo.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
