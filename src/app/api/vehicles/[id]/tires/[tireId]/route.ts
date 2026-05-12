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

type Ctx = { params: { id: string; tireId: string } };

export const DELETE = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Erst die Foto-Pfade laden um Storage zu bereinigen
  const { data: photos } = await admin
    .from("tire_photos")
    .select("photo_path")
    .eq("tire_id", params.tireId);

  const paths = (photos ?? [])
    .map((p) => p.photo_path)
    .filter((p): p is string => !!p);
  if (paths.length > 0) {
    await admin.storage.from("tire-photos").remove(paths);
  }

  const { error } = await admin
    .from("vehicle_tires")
    .delete()
    .eq("id", params.tireId)
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
