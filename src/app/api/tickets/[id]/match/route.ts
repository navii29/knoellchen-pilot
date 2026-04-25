import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { normalizePlate } from "@/lib/plate";

export const POST = async (
  _req: Request,
  { params }: { params: { id: string } }
) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("tickets")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!ticket) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
  if (!ticket.plate || !ticket.offense_date) {
    return NextResponse.json(
      { error: "Kennzeichen oder Tatdatum fehlt — zuerst /parse aufrufen" },
      { status: 400 }
    );
  }

  const ticketPlate = normalizePlate(ticket.plate);
  if (!ticketPlate) {
    return NextResponse.json({ error: "Kennzeichen ungültig" }, { status: 400 });
  }

  // Alle Vertrags-Kandidaten der Org an diesem Tatdatum holen, dann normalisiert vergleichen.
  // (Datums-Filter über DB, Plate-Match in JS — robust gegen Formatabweichungen.)
  const { data: candidates } = await admin
    .from("contracts")
    .select("*")
    .eq("org_id", ticket.org_id)
    .lte("pickup_date", ticket.offense_date)
    .order("pickup_date", { ascending: false });

  const match = (candidates ?? []).find((c) => {
    if (normalizePlate(c.plate) !== ticketPlate) return false;
    const end = c.actual_return_date ?? c.return_date;
    return end >= ticket.offense_date;
  });

  if (!match) {
    return NextResponse.json({ ok: true, matched: false });
  }

  await admin
    .from("tickets")
    .update({
      contract_id: match.id,
      renter_name: match.renter_name,
      renter_email: match.renter_email,
      status: "zugeordnet",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticket.id);

  await admin.from("ticket_logs").insert({
    ticket_id: ticket.id,
    action: "matched",
    details: { renter_name: match.renter_name, contract_id: match.id, contract_nr: match.contract_nr },
  });

  return NextResponse.json({ ok: true, matched: true, match });
};
