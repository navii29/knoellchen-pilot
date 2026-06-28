import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Operator-Download des bei der Genehmigung erzeugten "Nachtrag zum Mietvertrag"
// (Verlängerungs-Beleg). Liest addendum_pdf_path der extension-Zeile STRIKT
// org-scoped und leitet auf eine kurzlebige signierte URL weiter — gleiches
// Muster wie der signierte Vertrag (contract-pdf/route.ts). Kein neuer Signer-
// Helper: createSignedUrl ist die etablierte Inline-Konvention.

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

type Ctx = { params: { id: string; extId: string } };

export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ext } = await admin
    .from("contract_extensions")
    .select("addendum_pdf_path, addendum_signed_path")
    .eq("id", params.extId)
    .eq("contract_id", params.id)
    .eq("org_id", auth.org_id) // SECURITY: multi-tenant isolation
    .maybeSingle();

  // Signierten Beleg bevorzugen (nach dem Unterschreiben), sonst den
  // unsignierten Nachtrag. Scope unverändert.
  const path =
    (ext?.addendum_signed_path as string | null) ??
    (ext?.addendum_pdf_path as string | null) ??
    null;
  if (!path) return NextResponse.json({ error: "Kein Nachtrag vorhanden" }, { status: 404 });

  const { data: signed } = await admin.storage
    .from("generated-docs")
    .createSignedUrl(path, 60 * 5);
  if (!signed?.signedUrl)
    return NextResponse.json({ error: "Nachtrag nicht abrufbar" }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl, { status: 302 });
};
