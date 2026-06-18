import { NextResponse } from "next/server";
import { requirePortal } from "@/lib/portal-auth";

export const GET = async () => {
  const ctx = await requirePortal();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // RLS (portal own contracts) beschränkt auf die eigenen Verträge; die
  // .eq-Filter bleiben als Defense-in-Depth.
  const { data, error } = await ctx.supa
    .from("contracts")
    .select(
      "id, contract_nr, plate, vehicle_type, pickup_date, pickup_time, return_date, return_time, actual_return_date, daily_rate, total_amount, deposit, status, signed_at"
    )
    .eq("org_id", ctx.session.org_id)
    .eq("customer_id", ctx.session.customer_id)
    .order("pickup_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, contracts: data ?? [] });
};
