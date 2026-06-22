import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ownerOnly } from "@/lib/team";
import type { Contract } from "@/lib/types";
import {
  calculateCommission,
  contractDays,
  type SalesPartner,
} from "@/lib/partners";

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

type Ctx = { params: { id: string } };

export const GET = async (req: Request, { params }: Ctx) => {
  const gate = await ownerOnly(); // Partner-Abrechnung (EK/VK/Provision) nur für Inhaber
  if (!gate.ok) return gate.res;
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("sales_partners")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!partner)
    return NextResponse.json({ error: "Partner nicht gefunden" }, { status: 404 });

  let q = admin
    .from("contracts")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("partner_id", params.id)
    .order("pickup_date", { ascending: false });

  // Filter: Verträge deren Mietzeitraum mit [from, to] überlappt
  if (from) q = q.gte("pickup_date", from);
  if (to) q = q.lte("pickup_date", to);

  const { data: contracts, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = ((contracts ?? []) as Contract[]).map((c) => {
    const days = contractDays(c);
    const result = calculateCommission({
      partner: partner as SalesPartner,
      purchase_price_per_day: c.partner_purchase_price ?? null,
      selling_price_per_day: c.partner_selling_price ?? null,
      days,
    });
    return {
      contract_id: c.id,
      contract_nr: c.contract_nr,
      plate: c.plate,
      vehicle_type: c.vehicle_type,
      renter_name: c.renter_name,
      pickup_date: c.pickup_date,
      return_date: c.actual_return_date ?? c.return_date,
      days,
      purchase_price_per_day: c.partner_purchase_price,
      selling_price_per_day: c.partner_selling_price,
      stored_commission: c.partner_commission,
      computed_commission: result.commission_eur,
      total_purchase: result.total_purchase,
      total_selling: result.total_selling,
    };
  });

  const totals = items.reduce(
    (acc, it) => {
      acc.commission += Number(it.computed_commission ?? 0);
      acc.purchase += Number(it.total_purchase ?? 0);
      acc.selling += Number(it.total_selling ?? 0);
      acc.days += it.days;
      return acc;
    },
    { commission: 0, purchase: 0, selling: 0, days: 0 }
  );

  return NextResponse.json({
    ok: true,
    partner,
    period: { from: from ?? null, to: to ?? null },
    items,
    totals: {
      contract_count: items.length,
      total_days: totals.days,
      total_purchase: Math.round(totals.purchase * 100) / 100,
      total_selling: Math.round(totals.selling * 100) / 100,
      total_commission: Math.round(totals.commission * 100) / 100,
    },
  });
};
