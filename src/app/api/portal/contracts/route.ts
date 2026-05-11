import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const GET = async () => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contracts")
    .select(
      "id, contract_nr, plate, vehicle_type, pickup_date, pickup_time, return_date, return_time, actual_return_date, daily_rate, total_amount, deposit, status, signed_at"
    )
    .eq("org_id", session.org_id)
    .eq("customer_id", session.customer_id)
    .order("pickup_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, contracts: data ?? [] });
};
