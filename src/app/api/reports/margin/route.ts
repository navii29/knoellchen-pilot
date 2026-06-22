import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ownerOnly } from "@/lib/team";
import {
  computeFleetMargin,
  lastNDaysIso,
  previousPeriodIso,
} from "@/lib/margin";
import type { Contract, Vehicle } from "@/lib/types";

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
  const gate = await ownerOnly(); // Margen sind nur für Inhaber
  if (!gate.ok) return gate.res;
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const def = lastNDaysIso(7);
  const from = url.searchParams.get("from") ?? def.from;
  const to = url.searchParams.get("to") ?? def.to;
  const includeComparison = url.searchParams.get("compare") !== "false";

  const admin = createAdminClient();
  const [{ data: vehicles }, { data: contracts }] = await Promise.all([
    admin
      .from("vehicles")
      .select(
        "id, plate, manufacturer, model, vehicle_type, cost_daily, cost_monthly, target_daily_rate, daily_rate, status"
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
  ]);

  const current = computeFleetMargin({
    vehicles: (vehicles ?? []) as unknown as Vehicle[],
    contracts: (contracts ?? []) as Contract[],
    from,
    to,
  });

  let previous = null;
  if (includeComparison) {
    const prev = previousPeriodIso(from, to);
    const { data: prevContracts } = await admin
      .from("contracts")
      .select(
        "id, plate, vehicle_id, pickup_date, return_date, actual_return_date, daily_rate, status"
      )
      .eq("org_id", auth.org_id)
      .lte("pickup_date", prev.to)
      .gte("return_date", prev.from);
    const fm = computeFleetMargin({
      vehicles: (vehicles ?? []) as unknown as Vehicle[],
      contracts: (prevContracts ?? []) as Contract[],
      from: prev.from,
      to: prev.to,
    });
    previous = {
      from: prev.from,
      to: prev.to,
      total_margin: fm.total_margin,
      total_ist_vk: fm.total_ist_vk,
      avg_utilization_pct: fm.avg_utilization_pct,
    };
  }

  return NextResponse.json({
    ok: true,
    period: { from, to },
    margin: current,
    previous,
  });
};
