import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";

// Reservierungs-Anfrage des Kunden (Status 'angefragt'; Betreiber bestätigt).
export const POST = async (req: Request) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    vehicle_id?: string | null;
    vehicle_wish?: string;
    pickup_date?: string;
    return_date?: string;
    note?: string;
  };
  if (!body.pickup_date || !body.return_date)
    return NextResponse.json({ error: "Zeitraum fehlt" }, { status: 400 });
  if (body.return_date < body.pickup_date)
    return NextResponse.json(
      { error: "Rückgabe muss nach der Abholung liegen." },
      { status: 400 }
    );

  const admin = createAdminClient();

  // vehicle_id (falls gewählt) muss zur Org gehören
  let vehicleId: string | null = null;
  if (body.vehicle_id) {
    const { data: v } = await admin
      .from("vehicles")
      .select("id")
      .eq("id", body.vehicle_id)
      .eq("org_id", session.org_id)
      .maybeSingle();
    if (v) vehicleId = v.id as string;
  }

  const clean = (s?: string) => (s && s.trim() ? s.trim() : null);
  const { error } = await admin.from("reservation_requests").insert({
    customer_id: session.customer_id,
    org_id: session.org_id,
    vehicle_id: vehicleId,
    vehicle_wish: clean(body.vehicle_wish),
    pickup_date: body.pickup_date,
    return_date: body.return_date,
    note: clean(body.note),
    status: "angefragt",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
};
