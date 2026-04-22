import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const requireAuth = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  return profile ? { user, org_id: profile.org_id } : null;
};

export const PATCH = async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const allowed = [
    "status",
    "plate",
    "vehicle_type",
    "offense",
    "offense_details",
    "location",
    "offense_date",
    "offense_time",
    "authority",
    "reference_nr",
    "fine_amount",
    "deadline",
    "notes",
    "paid",
    "letter_sent",
    "authority_sent",
    "booking_id",
    "renter_name",
    "renter_email",
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });

  update.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .update(update)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (update.paid === true) {
    await admin.from("ticket_logs").insert({
      ticket_id: params.id,
      action: "paid",
      details: {},
    });
  }

  return NextResponse.json({ ok: true, ticket });
};

export const DELETE = async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("tickets")
    .delete()
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
