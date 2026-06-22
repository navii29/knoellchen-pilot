import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ownerOnly } from "@/lib/team";
import { computeFleetMargin, lastNDaysIso } from "@/lib/margin";
import { generateMarginPdf } from "@/lib/margin-pdf";
import type { Contract, Organization, Vehicle } from "@/lib/types";

export const maxDuration = 30;

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

export const GET = async (req: Request) => {
  const gate = await ownerOnly(); // Margen-PDF nur für Inhaber
  if (!gate.ok) return gate.res;
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const def = lastNDaysIso(7);
  const from = url.searchParams.get("from") ?? def.from;
  const to = url.searchParams.get("to") ?? def.to;

  const admin = createAdminClient();
  const [{ data: vehicles }, { data: contracts }, { data: org }] = await Promise.all([
    admin
      .from("vehicles")
      .select(
        "id, plate, manufacturer, model, vehicle_type, cost_daily, cost_monthly, target_daily_rate, daily_rate, status, onetime_cost_supplier, onetime_cost_pickup, onetime_cost_return, first_registration, decommission_date"
      )
      .eq("org_id", auth.org_id)
      .neq("status", "ausgesteuert"),
    admin
      .from("contracts")
      .select(
        "id, plate, vehicle_id, pickup_date, return_date, actual_return_date, daily_rate, status"
      )
      .eq("org_id", auth.org_id)
      .lte("pickup_date", to)
      .gte("return_date", from),
    admin.from("organizations").select("*").eq("id", auth.org_id).single(),
  ]);

  if (!org)
    return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });

  const margin = computeFleetMargin({
    vehicles: (vehicles ?? []) as unknown as Vehicle[],
    contracts: (contracts ?? []) as Contract[],
    from,
    to,
  });

  const buf = generateMarginPdf({
    org: org as Organization,
    margin,
  });

  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="margenauswertung-${from}-${to}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
};
