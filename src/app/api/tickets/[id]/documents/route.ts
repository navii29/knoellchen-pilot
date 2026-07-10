import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  generateInvoicePdf,
  generateLetterPdf,
  generateQuestionnairePdf,
} from "@/lib/pdf-generator";
import { computeCharge } from "@/lib/charge";
import { loadLogoBase64 } from "@/lib/contract-loaders";
import type { Contract, Customer, Organization, Ticket } from "@/lib/types";

export const POST = async (
  _req: Request,
  { params }: { params: { id: string } }
) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: ticket }, { data: org }] = await Promise.all([
    admin.from("tickets").select("*").eq("id", params.id).single(),
    admin.from("organizations").select("*").eq("id", profile.org_id).single(),
  ]);
  if (!ticket || ticket.org_id !== profile.org_id)
    return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  if (!org) return NextResponse.json({ error: "Organisation nicht gefunden" }, { status: 404 });

  const t = ticket as Ticket;
  const o = org as Organization;

  const { data: contractData } = t.contract_id
    ? await admin.from("contracts").select("*").eq("id", t.contract_id).maybeSingle()
    : { data: null };
  const contract = (contractData as Contract | null) ?? null;

  const { data: customerData } = contract?.customer_id
    ? await admin
        .from("customers")
        .select("salutation, first_name, last_name, street, zip, city, birthday")
        .eq("id", contract.customer_id)
        .eq("org_id", profile.org_id)
        .maybeSingle()
    : { data: null };
  // Fallback-Quelle für Mieter-Anschrift/Geburtsdatum, wenn am Vertrag nicht
  // mitgeschrieben (verknüpfter Kunde ist die Quelle der Wahrheit).
  const customer =
    (customerData as Pick<
      Customer,
      "salutation" | "street" | "zip" | "city" | "birthday"
    > | null) ?? null;

  // Echtes Org-Logo für den Briefkopf (Bucket "brand"); null → Initial-Fallback.
  const logoDataUri = await loadLogoBase64(admin, o.logo_path ?? null);

  // §14 UStG: ohne Bankverbindung ist die Rechnung nicht zahlbar → blockieren.
  if (!o.iban || !o.iban.trim()) {
    return NextResponse.json(
      {
        error:
          "Bankverbindung fehlt — bitte zuerst IBAN in den Einstellungen hinterlegen, damit die Rechnung zahlbar ist.",
      },
      { status: 400 }
    );
  }

  // Charge mit aktuellem USt-Status der Org neu berechnen (Kleinunternehmer → 0%),
  // damit die Rechnung immer zur aktuellen Steuerlage passt.
  const breakdown = computeCharge({
    fineAmount: t.fine_amount,
    chargeFine: t.charge_fine ?? true,
    feeNet: t.fee_net ?? o.processing_fee,
    chargeFee: t.charge_fee ?? true,
    vatRate: o.kleinunternehmer ? 0 : undefined,
  });
  t.fee_net = breakdown.fee_net;
  t.fee_vat = breakdown.fee_vat;
  t.fee_gross = breakdown.fee_gross;
  t.total_charge = breakdown.total_charge;

  // Fortlaufende, eindeutige Rechnungsnummer vergeben (einmalig, dann stabil).
  if (!t.invoice_nr) {
    const { data: nr, error: nrErr } = await admin.rpc("next_invoice_nr", {
      p_org: t.org_id,
    });
    if (nrErr || !nr) {
      return NextResponse.json(
        { error: `Rechnungsnummer konnte nicht vergeben werden: ${nrErr?.message ?? "unbekannt"}` },
        { status: 500 }
      );
    }
    t.invoice_nr = nr as string;
  }

  const letter = generateLetterPdf(o, t, contract, customer, logoDataUri);
  const invoice = generateInvoicePdf(o, t, contract, customer, logoDataUri);
  const questionnaire = generateQuestionnairePdf(o, t, contract, customer, logoDataUri);

  // Storage-Pfad auf die UUID des Tickets — verhindert das Überschreiben fremder
  // Belege bei kollidierender Vorgangs-Nr. (ticket_nr ist nur ein Anzeige-Label).
  const base = `${t.org_id}/${t.id}`;
  const paths = {
    letter_path: `${base}/anschreiben.pdf`,
    invoice_path: `${base}/rechnung.pdf`,
    questionnaire_path: `${base}/zeugenfragebogen.pdf`,
  };

  const uploads = await Promise.all([
    admin.storage.from("generated-docs").upload(paths.letter_path, letter, {
      contentType: "application/pdf",
      upsert: true,
    }),
    admin.storage.from("generated-docs").upload(paths.invoice_path, invoice, {
      contentType: "application/pdf",
      upsert: true,
    }),
    admin.storage.from("generated-docs").upload(paths.questionnaire_path, questionnaire, {
      contentType: "application/pdf",
      upsert: true,
    }),
  ]);
  const errored = uploads.find((u) => u.error);
  if (errored?.error)
    return NextResponse.json({ error: errored.error.message }, { status: 500 });

  await admin
    .from("tickets")
    .update({
      ...paths,
      invoice_nr: t.invoice_nr,
      fee_net: t.fee_net,
      fee_vat: t.fee_vat,
      fee_gross: t.fee_gross,
      total_charge: t.total_charge,
      updated_at: new Date().toISOString(),
    })
    .eq("id", t.id);
  await admin.from("ticket_logs").insert({
    ticket_id: t.id,
    action: "documents",
    details: paths,
  });

  return NextResponse.json({ ok: true, paths });
};
