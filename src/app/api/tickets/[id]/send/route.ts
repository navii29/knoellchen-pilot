import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Ticket } from "@/lib/types";

export const maxDuration = 30;

type Action = "mieter" | "behoerde" | "beide";

/**
 * Markiert einen Strafzettel als versendet.
 *
 * E-Mail-Versand wurde aus dem Produkt entfernt — die generierten PDFs
 * (Anschreiben, Rechnung, Zeugenfragebogen) lädt der Betrieb im Ticket-Detail
 * herunter und versendet sie über den eigenen Kanal (Post/eigene E-Mail).
 * Dieser Endpoint setzt nur noch den Versand-Status + Audit-Log.
 */
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

  const body = (await req.json().catch(() => ({}))) as {
    action?: Action;
    behoerde_email?: string;
  };
  const action: Action = body.action || "mieter";

  const admin = createAdminClient();
  const { data: ticketData } = await admin
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!ticketData || ticketData.org_id !== profile.org_id) {
    return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  }
  const ticket = ticketData as Ticket;

  const nowIso = new Date().toISOString();
  const nextStatus =
    ticket.status === "neu" || ticket.status === "zugeordnet"
      ? "weiterbelastet"
      : ticket.status;
  const update: Record<string, unknown> = { status: nextStatus, updated_at: nowIso };
  const results: Record<string, unknown> = {};

  if (action === "mieter" || action === "beide") {
    if (!ticket.letter_path || !ticket.invoice_path) {
      return NextResponse.json(
        { error: 'PDFs fehlen — bitte zuerst "PDFs erstellen" klicken' },
        { status: 400 }
      );
    }
    update.letter_sent = true;
    update.letter_sent_at = nowIso;
    update.letter_sent_to = ticket.renter_email ?? ticket.renter_name ?? null;
    results.renter = { ok: true };
  }

  if (action === "behoerde" || action === "beide") {
    if (!ticket.questionnaire_path) {
      return NextResponse.json(
        { error: 'Zeugenfragebogen-PDF fehlt — bitte zuerst "PDFs erstellen" klicken' },
        { status: 400 }
      );
    }
    const recipient = body.behoerde_email || ticket.authority_email || null;
    update.authority_sent = true;
    update.authority_sent_at = nowIso;
    update.authority_sent_to = recipient;
    if (recipient) update.authority_email = recipient;
    results.authority = { ok: true };
  }

  const { error } = await admin.from("tickets").update(update).eq("id", ticket.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from("ticket_logs").insert({
    ticket_id: ticket.id,
    action: action === "behoerde" ? "marked_sent_authority" : action === "beide" ? "marked_sent_both" : "marked_sent_renter",
    details: { marked_manually: true, ...results },
  });

  return NextResponse.json({ ok: true, marked_sent: true, ...results });
};
