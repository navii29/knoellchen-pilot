import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/postmark";
import { renterEmail, authorityEmail } from "@/lib/email-templates";
import type { Contract, Organization, Ticket } from "@/lib/types";

export const maxDuration = 30;

type Action = "mieter" | "behoerde" | "beide";

const downloadAsBase64 = async (
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  path: string
): Promise<string | null> => {
  const { data } = await admin.storage.from(bucket).download(path);
  if (!data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.toString("base64");
};

const testOverride = (): string | null => {
  const v = process.env.EMAIL_TEST_OVERRIDE?.trim();
  return v && v.length > 0 ? v : null;
};

export const POST = async (
  req: Request,
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

  const body = (await req.json()) as { action?: Action; behoerde_email?: string };
  const action: Action = body.action || "mieter";

  const admin = createAdminClient();
  const [{ data: ticketData }, { data: orgData }] = await Promise.all([
    admin.from("tickets").select("*").eq("id", params.id).single(),
    admin.from("organizations").select("*").eq("id", profile.org_id).single(),
  ]);
  if (!ticketData || ticketData.org_id !== profile.org_id) {
    return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  }
  if (!orgData) return NextResponse.json({ error: "Organisation nicht gefunden" }, { status: 404 });

  const ticket = ticketData as Ticket;
  const org = orgData as Organization;

  const { data: contractData } = ticket.contract_id
    ? await admin.from("contracts").select("*").eq("id", ticket.contract_id).maybeSingle()
    : { data: null };
  const contract = (contractData as Contract | null) ?? null;

  const fromAddress =
    org.sender_email && org.sender_name
      ? `${org.sender_name} <${org.sender_email}>`
      : org.sender_email
      ? org.sender_email
      : `${org.name} <${process.env.POSTMARK_DEFAULT_SENDER || "noreply@knoellchen-pilot.de"}>`;

  const override = testOverride();
  const subjectPrefix = override ? "[TEST] " : "";

  const results: Record<string, unknown> = {};

  if (action === "mieter" || action === "beide") {
    if (!ticket.renter_email) {
      return NextResponse.json(
        { error: "Mieter-E-Mail fehlt — Vertrag prüfen" },
        { status: 400 }
      );
    }
    if (!ticket.letter_path || !ticket.invoice_path) {
      return NextResponse.json(
        { error: 'PDFs fehlen — bitte zuerst "PDFs erstellen" klicken' },
        { status: 400 }
      );
    }
    const [letterB64, invoiceB64] = await Promise.all([
      downloadAsBase64(admin, "generated-docs", ticket.letter_path),
      downloadAsBase64(admin, "generated-docs", ticket.invoice_path),
    ]);
    if (!letterB64 || !invoiceB64) {
      return NextResponse.json({ error: "PDFs konnten nicht geladen werden" }, { status: 500 });
    }
    const tpl = renterEmail(org, ticket, contract);
    const originalRecipient = ticket.renter_email;
    const actualRecipient = override ?? originalRecipient;
    try {
      const send = await sendEmail({
        from: fromAddress,
        to: actualRecipient,
        subject: subjectPrefix + tpl.subject,
        htmlBody: tpl.html,
        textBody: tpl.text,
        replyTo: org.sender_email || org.email || undefined,
        attachments: [
          { name: `Anschreiben-${ticket.ticket_nr}.pdf`, contentBase64: letterB64, contentType: "application/pdf" },
          { name: `Rechnung-${ticket.ticket_nr}.pdf`, contentBase64: invoiceB64, contentType: "application/pdf" },
        ],
      });
      results.renter = { ok: true, message_id: send.MessageID };
      // letter_sent_to bleibt der ORIGINAL-Empfänger — Test-Override wird nur im Log festgehalten
      await admin
        .from("tickets")
        .update({
          letter_sent: true,
          letter_sent_at: new Date().toISOString(),
          letter_sent_to: originalRecipient,
          status: ticket.status === "neu" || ticket.status === "zugeordnet" ? "weiterbelastet" : ticket.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
      await admin.from("ticket_logs").insert({
        ticket_id: ticket.id,
        action: "sent_renter",
        details: {
          to: originalRecipient,
          delivered_to: actualRecipient,
          test_mode: override !== null,
          message_id: send.MessageID,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Postmark (Mieter): ${msg}` }, { status: 500 });
    }
  }

  if (action === "behoerde" || action === "beide") {
    const recipient = body.behoerde_email || ticket.authority_email || null;
    if (!recipient) {
      return NextResponse.json(
        { error: "Behörden-E-Mail fehlt — bitte angeben" },
        { status: 400 }
      );
    }
    if (!ticket.questionnaire_path) {
      return NextResponse.json(
        { error: 'Zeugenfragebogen-PDF fehlt — bitte zuerst "PDFs erstellen" klicken' },
        { status: 400 }
      );
    }
    const qB64 = await downloadAsBase64(admin, "generated-docs", ticket.questionnaire_path);
    if (!qB64) return NextResponse.json({ error: "PDF konnte nicht geladen werden" }, { status: 500 });

    const tpl = authorityEmail(org, ticket, contract);
    const actualRecipient = override ?? recipient;
    try {
      const send = await sendEmail({
        from: fromAddress,
        to: actualRecipient,
        subject: subjectPrefix + tpl.subject,
        htmlBody: tpl.html,
        textBody: tpl.text,
        replyTo: org.sender_email || org.email || undefined,
        attachments: [
          {
            name: `Zeugenfragebogen-${ticket.ticket_nr}.pdf`,
            contentBase64: qB64,
            contentType: "application/pdf",
          },
        ],
      });
      results.authority = { ok: true, message_id: send.MessageID };
      // authority_sent_to bleibt die ORIGINAL-Behörden-Adresse
      await admin
        .from("tickets")
        .update({
          authority_sent: true,
          authority_sent_at: new Date().toISOString(),
          authority_sent_to: recipient,
          authority_email: recipient,
          status: ticket.status === "neu" || ticket.status === "zugeordnet" ? "weiterbelastet" : ticket.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
      await admin.from("ticket_logs").insert({
        ticket_id: ticket.id,
        action: "sent_authority",
        details: {
          to: recipient,
          delivered_to: actualRecipient,
          test_mode: override !== null,
          message_id: send.MessageID,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Postmark (Behörde): ${msg}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    test_override: override,
    ...results,
  });
};
