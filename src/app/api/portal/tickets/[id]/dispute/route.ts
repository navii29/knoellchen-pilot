import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPortalSession, ipFromHeaders } from "@/lib/portal-auth";

// Einspruch / "Ich war nicht der Fahrer". Legt einen ticket_disputes-Eintrag an
// (Admin-Client + Ownership-Check) und markiert das Ticket als 'dispute offen'.
export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    kind?: "not_driver" | "objection";
    reason?: string;
    named_driver_name?: string;
    named_driver_address?: string;
    named_driver_email?: string;
  };
  const kind = body.kind === "not_driver" ? "not_driver" : "objection";

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
  const clean = (v?: string) => (v && v.trim() ? v.trim() : null);
  const { error } = await admin.from("ticket_disputes").insert({
    ticket_id: params.id,
    customer_id: session.customer_id,
    org_id: session.org_id,
    kind,
    reason: clean(body.reason),
    named_driver_name: kind === "not_driver" ? clean(body.named_driver_name) : null,
    named_driver_address: kind === "not_driver" ? clean(body.named_driver_address) : null,
    named_driver_email: kind === "not_driver" ? clean(body.named_driver_email) : null,
    ip,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin
    .from("tickets")
    .update({ dispute_status: "offen", updated_at: new Date().toISOString() })
    .eq("id", params.id);
  await admin.from("ticket_logs").insert({
    ticket_id: params.id,
    action: "disputed_by_renter",
    details: { kind, ip },
  });

  return NextResponse.json({ ok: true });
};
