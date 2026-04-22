import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

  const normPlate = ticket.plate.toUpperCase().replace(/\s+/g, " ").trim();
  const altPlate = normPlate.replace(/\s+/g, "");

  // Vertrag suchen: Plate stimmt, pickup_date vor Tatdatum,
  // (actual_return_date oder return_date) am/nach Tatdatum.
  const { data: matches } = await admin
    .from("contracts")
    .select("*")
    .eq("org_id", ticket.org_id)
    .or(`plate.eq.${normPlate},plate.eq.${altPlate}`)
    .lte("pickup_date", ticket.offense_date)
    .order("pickup_date", { ascending: false });

  const match = (matches ?? []).find((c) => {
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
