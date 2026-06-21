import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  LexOfficeError,
  lxDownloadFile,
  lxRenderInvoiceDocument,
} from "@/lib/lexoffice";

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

/** Liefert die Miet- oder Kautions-Rechnung als PDF (von LexOffice gerendert). */
export const GET = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const type =
    new URL(req.url).searchParams.get("type") === "deposit" ? "deposit" : "rental";

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("lexoffice_api_key, lexoffice_enabled")
    .eq("id", auth.org_id)
    .single();
  if (!org?.lexoffice_enabled || !org.lexoffice_api_key) {
    return NextResponse.json(
      { error: "LexOffice ist nicht aktiviert." },
      { status: 400 }
    );
  }

  const { data: contract } = await admin
    .from("contracts")
    .select("id, contract_nr, lexoffice_invoice_id, deposit_invoice_id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  const invoiceId =
    type === "deposit" ? contract.deposit_invoice_id : contract.lexoffice_invoice_id;
  if (!invoiceId) {
    return NextResponse.json(
      { error: "Für diesen Vertrag existiert (noch) keine Rechnung." },
      { status: 404 }
    );
  }

  try {
    const { documentFileId } = await lxRenderInvoiceDocument(
      org.lexoffice_api_key,
      invoiceId
    );
    const pdf = await lxDownloadFile(org.lexoffice_api_key, documentFileId);
    const label = type === "deposit" ? "Kaution" : "Rechnung";
    const filename = `${label}-${contract.contract_nr}.pdf`.replace(/[^\w.\-]+/g, "_");
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof LexOfficeError) {
      // 406 = Beleg wird noch gerendert
      const msg =
        e.status === 406
          ? "PDF wird gerade erzeugt — bitte in ein paar Sekunden erneut versuchen."
          : `LexOffice-Fehler ${e.status}: ${e.message}`;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json(
      { error: "PDF konnte nicht geladen werden." },
      { status: 500 }
    );
  }
};
