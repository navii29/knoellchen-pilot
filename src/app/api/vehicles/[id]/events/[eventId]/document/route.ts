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

export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("vehicle_events")
    .select("document_path")
    .eq("id", params.eventId)
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!event?.document_path)
    return NextResponse.json({ error: "Kein Beleg" }, { status: 404 });

  const { data, error } = await admin.storage
    .from("vehicle-documents")
    .createSignedUrl(event.document_path, 60 * 5);
  if (error || !data?.signedUrl)
    return NextResponse.json(
      { error: error?.message ?? "Signierung fehlgeschlagen" },
      { status: 500 }
    );

  return NextResponse.redirect(data.signedUrl, { status: 302 });
};
