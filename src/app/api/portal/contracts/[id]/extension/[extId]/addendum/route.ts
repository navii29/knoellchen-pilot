import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";

// Mieter-Download des "Nachtrag zum Mietvertrag" (Verlängerungs-Beleg). Liest
// addendum_pdf_path STRIKT auf die eigene Verlängerung gescoped (org_id +
// customer_id der Portal-Session) und leitet auf eine kurzlebige signierte URL
// weiter — gleiches Muster wie der signierte Vertrag im Portal
// (portal/.../contract-pdf/route.ts). Der Mieter erhält nur die eigene, 5 Min
// gültige URL.

type Ctx = { params: { id: string; extId: string } };

export const GET = async (_req: Request, { params }: Ctx) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ext } = await admin
    .from("contract_extensions")
    .select("addendum_pdf_path")
    .eq("id", params.extId)
    .eq("contract_id", params.id)
    .eq("org_id", session.org_id) // SECURITY: multi-tenant isolation
    .eq("customer_id", session.customer_id) // SECURITY: nur eigene Verlängerung
    .maybeSingle();

  const path = (ext?.addendum_pdf_path as string | null) ?? null;
  if (!path) return NextResponse.json({ error: "Kein Nachtrag vorhanden" }, { status: 404 });

  const { data: signed } = await admin.storage
    .from("generated-docs")
    .createSignedUrl(path, 60 * 5);
  if (!signed?.signedUrl)
    return NextResponse.json({ error: "Nachtrag nicht abrufbar" }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl, { status: 302 });
};
