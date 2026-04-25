import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { computeReturnSummary } from "@/lib/km";

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

export const POST = async (req: Request, { params }: { params: { id: string } }) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as { actual_return_date?: string; km_return?: number | string };
  const actualReturn = body.actual_return_date;
  const kmReturnRaw = body.km_return;
  if (!actualReturn) {
    return NextResponse.json({ error: "actual_return_date fehlt" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("pickup_date, return_date, km_pickup, km_limit, plate")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  let price: number | null = null;
  let inclusiveKmMonth: number | null = null;
  if (contract.plate) {
    const { data: v } = await admin
      .from("vehicles")
      .select("extra_km_price, inclusive_km_month, vehicle_type, manufacturer, model")
      .eq("org_id", auth.org_id)
      .eq("plate", contract.plate)
      .maybeSingle();
    if (v?.extra_km_price != null) price = Number(v.extra_km_price);
    if (v?.inclusive_km_month != null) inclusiveKmMonth = Number(v.inclusive_km_month);
  }

  const kmReturn =
    kmReturnRaw == null || kmReturnRaw === ""
      ? null
      : Number(String(kmReturnRaw).replace(",", "."));

  const summary = computeReturnSummary({
    pickupDate: contract.pickup_date,
    plannedReturnDate: contract.return_date,
    actualReturnDate: actualReturn,
    kmPickup: contract.km_pickup as number | null,
    kmReturn,
    inclusiveKmMonth,
    kmLimitOverride: contract.km_limit as number | null,
    pricePerKm: price,
  });

  return NextResponse.json({ ok: true, summary });
};
