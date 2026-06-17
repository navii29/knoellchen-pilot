import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Ticket } from "@/lib/types";

export const maxDuration = 30;

type Action = "mieter" | "behoerde" | "beide";

// E-Mail-Versand wurde entfernt. Diese Route markiert den Strafzettel als
// weiterbelastet bzw. an die Behörde gemeldet; die Zustellung der PDFs
// (Anschreiben/Rechnung/Zeugenfragebogen) erfolgt manuell durch den Betreiber.
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

  const now = new Date().toISOString();
  const nextStatus =
    ticket.status === "neu" || ticket.status === "zugeordnet"
      ? "weiterbelastet"
      : ticket.status;
  const results: Record<string, unknown> = {};

  if (action === "mieter" || action === "beide") {
    if (!ticket.renter_email && !ticket.renter_name) {
      return NextResponse.json(
        { error: "Kein Mieter zugeordnet — Vertrag prüfen" },
        { status: 400 }
      );
    }
    if (!ticket.letter_path || !ticket.invoice_path) {
      return NextResponse.json(
        { error: 'PDFs fehlen — bitte zuerst "PDFs erstellen" klicken' },
        { status: 400 }
      );
    }
    await admin
      .from("tickets")
      .update({
        letter_sent: true,
        letter_sent_at: now,
        letter_sent_to: ticket.renter_email ?? ticket.renter_name ?? null,
        status: nextStatus,
        updated_at: now,
      })
      .eq("id", ticket.id);
    await admin.from("ticket_logs").insert({
      ticket_id: ticket.id,
      action: "marked_forwarded_renter",
      details: { to: ticket.renter_email ?? ticket.renter_name ?? null },
    });
    results.renter = { ok: true, marked: true };
  }

  if (action === "behoerde" || action === "beide") {
    const recipient = body.behoerde_email || ticket.authority_email || null;
    if (!recipient) {
      return NextResponse.json(
        { error: "Behörde fehlt — bitte angeben" },
        { status: 400 }
      );
    }
    if (!ticket.questionnaire_path) {
      return NextResponse.json(
        { error: 'Zeugenfragebogen-PDF fehlt — bitte zuerst "PDFs erstellen" klicken' },
        { status: 400 }
      );
    }
    await admin
      .from("tickets")
      .update({
        authority_sent: true,
        authority_sent_at: now,
        authority_sent_to: recipient,
        authority_email: recipient,
        status: nextStatus,
        updated_at: now,
      })
      .eq("id", ticket.id);
    await admin.from("ticket_logs").insert({
      ticket_id: ticket.id,
      action: "marked_forwarded_authority",
      details: { to: recipient },
    });
    results.authority = { ok: true, marked: true };
  }

  return NextResponse.json({ ok: true, ...results });
};
