import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { lxGetInvoice, LexOfficeError } from "@/lib/lexoffice";

// Täglicher Cron: Pollt LexOffice für alle Orgs mit aktivem LexOffice-Zugang
// und markiert Tickets / Verträge als bezahlt, sobald der Invoice-Status "paid" ist.
// Nur vorwärts: Einmal bezahlt bleibt bezahlt (idempotent, nie rückwärts).
// Sequenzielle Verarbeitung pro Org (nicht parallel) um LexOffice Rate-Limit (~2 req/s)
// zu respektieren.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") !== null;
    if (auth !== `Bearer ${secret}` && !isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  let checked = 0;
  let markedPaid = 0;

  // Alle Orgs mit aktivem LexOffice laden
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, lexoffice_api_key")
    .eq("lexoffice_enabled", true)
    .not("lexoffice_api_key", "is", null);

  for (const org of orgs ?? []) {
    const apiKey = org.lexoffice_api_key as string;

    // Tickets dieser Org mit LexOffice-Invoice, die noch nicht bezahlt sind
    const { data: tickets } = await admin
      .from("tickets")
      .select("id, lexoffice_invoice_id")
      .eq("org_id", org.id)
      .not("lexoffice_invoice_id", "is", null)
      .or("payment_status.is.null,payment_status.neq.bezahlt");

    for (const record of tickets ?? []) {
      try {
        checked++;
        const inv = await lxGetInvoice(apiKey, record.lexoffice_invoice_id as string);
        if (inv.voucherStatus === "paid") {
          const { error } = await admin
            .from("tickets")
            .update({
              payment_status: "bezahlt",
              paid_at: new Date().toISOString(),
              status: "bezahlt",
            })
            .eq("id", record.id)
            .eq("org_id", org.id);
          if (!error) markedPaid++;
        }
      } catch (err) {
        // 429/404/Netzwerkfehler dürfen den Rest nicht abbrechen
        if (!(err instanceof LexOfficeError)) {
          console.error("Unexpected error polling LexOffice invoice", err);
        }
      }
    }

    // Verträge dieser Org mit LexOffice-Invoice, die noch nicht bezahlt sind
    const { data: contracts } = await admin
      .from("contracts")
      .select("id, lexoffice_invoice_id")
      .eq("org_id", org.id)
      .not("lexoffice_invoice_id", "is", null)
      .or("payment_status.is.null,payment_status.neq.bezahlt");

    for (const record of contracts ?? []) {
      try {
        checked++;
        const inv = await lxGetInvoice(apiKey, record.lexoffice_invoice_id as string);
        if (inv.voucherStatus === "paid") {
          const { error } = await admin
            .from("contracts")
            .update({
              payment_status: "bezahlt",
              paid_at: new Date().toISOString(),
              // contract.status bleibt unverändert — Zahlung ≠ Mietlebenszyklus
            })
            .eq("id", record.id)
            .eq("org_id", org.id);
          if (!error) markedPaid++;
        }
      } catch (err) {
        if (!(err instanceof LexOfficeError)) {
          console.error("Unexpected error polling LexOffice contract invoice", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, checked, markedPaid });
};
