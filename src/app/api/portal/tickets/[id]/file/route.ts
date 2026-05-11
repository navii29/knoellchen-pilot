import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";

type Ctx = { params: { id: string } };

const KINDS = {
  letter: { col: "letter_path", bucket: "ticket-documents" },
  invoice: { col: "invoice_path", bucket: "ticket-documents" },
  questionnaire: { col: "questionnaire_path", bucket: "ticket-documents" },
} as const;

export const GET = async (req: Request, { params }: Ctx) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind") as keyof typeof KINDS | null;
  if (!kindParam || !KINDS[kindParam])
    return NextResponse.json({ error: "kind fehlt" }, { status: 400 });
  const meta = KINDS[kindParam];

  const admin = createAdminClient();
  // Sicherstellen dass das Ticket zu einem Vertrag des Kunden gehört
  const { data: ticket } = await admin
    .from("tickets")
    .select(`id, contract_id, ${meta.col}, contracts!inner(customer_id)`)
    .eq("id", params.id)
    .eq("org_id", session.org_id)
    .eq("contracts.customer_id", session.customer_id)
    .maybeSingle();
  if (!ticket)
    return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });

  const path = (ticket as Record<string, unknown>)[meta.col] as string | null;
  if (!path) return NextResponse.json({ error: "Datei fehlt" }, { status: 404 });

  const { data: signed } = await admin.storage
    .from(meta.bucket)
    .createSignedUrl(path, 60 * 5);
  if (!signed?.signedUrl)
    return NextResponse.json({ error: "Signed URL fehlt" }, { status: 500 });

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
};
