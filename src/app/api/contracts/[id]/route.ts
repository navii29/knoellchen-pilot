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
    "contract_nr",
    "plate",
    "vehicle_type",
    "renter_name",
    "renter_email",
    "renter_phone",
    "renter_address",
    "renter_birthday",
    "renter_license_nr",
    "renter_license_class",
    "renter_license_expiry",
    "pickup_date",
    "pickup_time",
    "return_date",
    "return_time",
    "actual_return_date",
    "daily_rate",
    "total_amount",
    "deposit",
    "km_pickup",
    "km_return",
    "status",
    "notes",
    "contract_pdf_path",
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });

  if (typeof update.plate === "string") update.plate = update.plate.toUpperCase();
  update.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contracts")
    .update(update)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, contract: data });
};

export const DELETE = async (_req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("contracts")
    .delete()
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
