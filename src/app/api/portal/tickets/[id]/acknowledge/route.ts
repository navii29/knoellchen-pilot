import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPortalSession, ipFromHeaders } from "@/lib/portal-auth";

// Fahrer-Bestätigung ("Ich war der Fahrer"). Schreibt serverseitig über den
// Admin-Client mit Ownership-Check (tickets hat keine Spalten-RLS).
export const POST = async (_req: Request, { params }: { params: { id: string } }) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const admin = createAdminClient();
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, contracts!inner(customer_id)")
    .eq("id", params.id)
    .eq("org_id", session.org_id)
    .eq("contracts.customer_id", session.customer_id)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ error: "Strafzettel nicht gefunden" }, { status: 404 });

  const ip = ipFromHeaders();
  const now = new Date().toISOString();
  await admin
    .from("tickets")
    .update({ acknowledged_at: now, acknowledged_ip: ip, updated_at: now })
    .eq("id", params.id);
  await admin.from("ticket_logs").insert({
    ticket_id: params.id,
    action: "acknowledged_by_renter",
    details: { ip },
  });

  return NextResponse.json({ ok: true });
};
