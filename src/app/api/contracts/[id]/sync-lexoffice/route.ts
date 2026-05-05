import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  LexOfficeError,
  buildContractInvoice,
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

  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract) {
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  }
  if (contract.status !== "abgeschlossen") {
    return NextResponse.json(
      { error: "Nur abgeschlossene Verträge können übertragen werden." },
      { status: 400 }
    );
  }
  if (contract.lexoffice_invoice_id) {
    return NextResponse.json(
      {
        error: "Bereits in LexOffice übertragen.",
        invoice_id: contract.lexoffice_invoice_id,
      },
      { status: 409 }
    );
  }

  const [{ data: customer }, { data: vehicle }] = await Promise.all([
    contract.customer_id
      ? admin
          .from("customers")
          .select("*")
          .eq("id", contract.customer_id)
          .eq("org_id", auth.org_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    contract.vehicle_id
      ? admin
          .from("vehicles")
          .select("manufacturer, model, vehicle_type, extra_km_price")
          .eq("id", contract.vehicle_id)
          .eq("org_id", auth.org_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const invoice = buildContractInvoice(contract, customer ?? null, vehicle ?? null);

  try {
    const result = await lxCreateInvoice(org.lexoffice_api_key, invoice);
    await admin
      .from("contracts")
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
