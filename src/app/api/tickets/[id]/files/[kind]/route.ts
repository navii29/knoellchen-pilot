import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const KIND_FIELDS = {
  letter: "letter_path",
  invoice: "invoice_path",
  questionnaire: "questionnaire_path",
  upload: "upload_path",
} as const;

const KIND_BUCKETS = {
  letter: "generated-docs",
  invoice: "generated-docs",
  questionnaire: "generated-docs",
  upload: "ticket-uploads",
} as const;

export const GET = async (
  _req: Request,
  { params }: { params: { id: string; kind: keyof typeof KIND_FIELDS } }
) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const field = KIND_FIELDS[params.kind];
  const bucket = KIND_BUCKETS[params.kind];
  if (!field) return NextResponse.json({ error: "Unbekannter Dokumenttyp" }, { status: 400 });

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("tickets")
    .select(`id, org_id, ${field}`)
    .eq("id", params.id)
    .single();
  if (!ticket || ticket.org_id !== profile.org_id) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }
  const path = (ticket as Record<string, unknown>)[field] as string | null;
  if (!path) return NextResponse.json({ error: "Datei nicht vorhanden" }, { status: 404 });

  const { data: signed } = await admin.storage.from(bucket).createSignedUrl(path, 600);
  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "Signed URL fehlgeschlagen" }, { status: 500 });
  }
  return NextResponse.redirect(signed.signedUrl);
};
