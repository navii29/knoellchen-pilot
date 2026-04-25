import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { normalizePlate } from "@/lib/plate";
import { computeCharge } from "@/lib/charge";

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
    "charge_fine",
    "charge_fee",
    "fee_net",
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nichts zu aktualisieren" }, { status: 400 });

  if (typeof update.plate === "string") update.plate = normalizePlate(update.plate);
  update.updated_at = new Date().toISOString();

  const admin = createAdminClient();

  // Bei Änderung von charge-relevanten Feldern: aktuellen Stand laden + neu berechnen
  const chargeFieldTouched = ["charge_fine", "charge_fee", "fee_net", "fine_amount"].some(
    (k) => k in body
  );
  if (chargeFieldTouched) {
    const { data: current } = await admin
      .from("tickets")
      .select("charge_fine, charge_fee, fee_net, fine_amount")
      .eq("id", params.id)
      .eq("org_id", auth.org_id)
      .maybeSingle();
    if (current) {
      const chargeFine =
        "charge_fine" in update ? Boolean(update.charge_fine) : Boolean(current.charge_fine);
      const chargeFee =
        "charge_fee" in update ? Boolean(update.charge_fee) : Boolean(current.charge_fee);
      const feeNet =
        "fee_net" in update
          ? Number(update.fee_net) || 0
          : Number(current.fee_net) || 0;
      const fineAmount =
        "fine_amount" in update
          ? Number(update.fine_amount) || 0
          : Number(current.fine_amount) || 0;

      const breakdown = computeCharge({
        fineAmount,
        chargeFine,
        feeNet,
        chargeFee,
      });
      update.charge_fine = breakdown.charge_fine;
      update.charge_fee = breakdown.charge_fee;
      update.fee_net = breakdown.fee_net;
      update.fee_vat = breakdown.fee_vat;
      update.fee_gross = breakdown.fee_gross;
      update.total_charge = breakdown.total_charge;
      // processing_fee bleibt synchron mit fee_gross für Backwards-Compat
      update.processing_fee = breakdown.fee_gross;
    }
  }

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
