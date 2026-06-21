import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  LexOfficeError,
  buildContractInvoice,
  buildDepositInvoice,
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

/**
 * Vertrag manuell aktivieren → stößt die Rechnungsstellung an.
 * - Miet-Rechnung (LexOffice), falls noch keine existiert.
 * - Separate, steuerneutrale Kautions-Rechnung, falls deposit > 0.
 * IDs werden inkrementell gespeichert, damit ein Teilfehler keine Waisen-
 * Rechnung in LexOffice hinterlässt (Retry überspringt bereits Erstelltes).
 * Ohne aktivierte LexOffice-Anbindung wird der Vertrag nur als aktiviert
 * markiert (keine Rechnung).
 */
export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  // Idempotent & lückenfüllend: ein erneuter Aufruf erstellt nur noch fehlende
  // Belege (z. B. eine nachträglich gesetzte Kaution) — die per-Beleg-Guards
  // unten verhindern Doppel-Rechnungen.
  if (contract.status === "storniert")
    return NextResponse.json(
      { error: "Stornierte Verträge können nicht aktiviert werden." },
      { status: 400 }
    );

  const { data: org } = await admin
    .from("organizations")
    .select("lexoffice_api_key, lexoffice_enabled")
    .eq("id", auth.org_id)
    .single();

  const lexofficeReady = Boolean(org?.lexoffice_enabled && org?.lexoffice_api_key);
  let rentalInvoiceId: string | null = contract.lexoffice_invoice_id ?? null;
  let depositInvoiceId: string | null = contract.deposit_invoice_id ?? null;

  if (lexofficeReady) {
    const apiKey = org!.lexoffice_api_key as string;
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
            .select(
              "manufacturer, model, vehicle_type, extra_km_price, lexoffice_product_id"
            )
            .eq("id", contract.vehicle_id)
            .eq("org_id", auth.org_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    try {
      // 1) Miet-Rechnung
      if (!rentalInvoiceId) {
        const invoice = buildContractInvoice(contract, customer ?? null, vehicle ?? null);
        const result = await lxCreateInvoice(apiKey, invoice);
        rentalInvoiceId = result.id;
        await admin
          .from("contracts")
          .update({ lexoffice_invoice_id: rentalInvoiceId })
          .eq("id", params.id)
          .eq("org_id", auth.org_id);
      }
      // 2) Separate, steuerneutrale Kautions-Rechnung
      if (!depositInvoiceId && Number(contract.deposit ?? 0) > 0) {
        const depInvoice = buildDepositInvoice(contract, customer ?? null);
        const depResult = await lxCreateInvoice(apiKey, depInvoice);
        depositInvoiceId = depResult.id;
        await admin
          .from("contracts")
          .update({ deposit_invoice_id: depositInvoiceId })
          .eq("id", params.id)
          .eq("org_id", auth.org_id);
      }
    } catch (e) {
      if (e instanceof LexOfficeError) {
        return NextResponse.json(
          { error: `LexOffice-Fehler ${e.status}: ${e.message}`, detail: e.body },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Rechnung fehlgeschlagen" },
        { status: 500 }
      );
    }
  }

  const { error } = await admin
    .from("contracts")
    .update({
      is_activated: true,
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    is_activated: true,
    invoiced: lexofficeReady,
    lexoffice_invoice_id: rentalInvoiceId,
    deposit_invoice_id: depositInvoiceId,
  });
};
