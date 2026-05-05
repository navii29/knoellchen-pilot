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

type Ctx = { params: { id: string; eventId: string } };

export const DELETE = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("vehicle_events")
    .select("id, vehicle_id, document_path")
    .eq("id", params.eventId)
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "Eintrag nicht gefunden" }, { status: 404 });

  if (event.document_path) {
    await admin.storage.from("vehicle-documents").remove([event.document_path]);
  }

  const { error } = await admin
    .from("vehicle_events")
    .delete()
    .eq("id", params.eventId)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
