import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  LexOfficeError,
  buildTicketInvoice,
  lxCreateInvoice,
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

export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("lexoffice_api_key, lexoffice_enabled")
    .eq("id", auth.org_id)
    .single();
  if (!org?.lexoffice_enabled) {
    return NextResponse.json(
      { error: "LexOffice ist für diese Organisation nicht aktiviert." },
      { status: 400 }
    );
  }
  if (!org.lexoffice_api_key) {
    return NextResponse.json(
      { error: "Kein LexOffice API-Key hinterlegt." },
      { status: 400 }
    );
  }

  const { data: ticket } = await admin
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!ticket) {
    return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  }
  if (!ticket.charge_fine && !ticket.charge_fee) {
    return NextResponse.json(
      { error: "Nichts zu berechnen — weder Bußgeld noch Bearbeitungsgebühr aktiviert." },
      { status: 400 }
    );
  }
  if (ticket.lexoffice_invoice_id) {
    return NextResponse.json(
      {
        error: "Bereits in LexOffice übertragen.",
        invoice_id: ticket.lexoffice_invoice_id,
      },
      { status: 409 }
    );
  }

  let contract = null;
  if (ticket.contract_id) {
    const { data } = await admin
      .from("contracts")
      .select("*")
      .eq("id", ticket.contract_id)
      .eq("org_id", auth.org_id)
      .maybeSingle();
    contract = data;
  }

  let customer = null;
  if (contract?.customer_id) {
    const { data } = await admin
      .from("customers")
      .select("*")
      .eq("id", contract.customer_id)
      .eq("org_id", auth.org_id)
      .maybeSingle();
    customer = data;
  }

  const invoice = buildTicketInvoice(ticket, contract ?? null, customer ?? null);

  try {
    const result = await lxCreateInvoice(org.lexoffice_api_key, invoice);
    await admin
      .from("tickets")
      .update({ lexoffice_invoice_id: result.id })
      .eq("id", params.id)
      .eq("org_id", auth.org_id);
    return NextResponse.json({
      ok: true,
      invoice_id: result.id,
      voucher_number: result.voucherNumber ?? null,
    });
  } catch (e) {
    if (e instanceof LexOfficeError) {
      return NextResponse.json(
        { error: `LexOffice-Fehler ${e.status}: ${e.message}`, detail: e.body },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unbekannter Fehler" },
      { status: 500 }
    );
  }
};
