import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { redactContractPartner } from "@/lib/redact";
import type { Contract } from "@/lib/types";

type Ctx = { params: { id: string } };

export const GET = async (_req: Request, { params }: Ctx) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", session.org_id)
    .eq("customer_id", session.customer_id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  // Partner-/Margen-Felder NIE ans Mieter-Portal (Owner-only). Eine Portal-Session
  // ist niemals Inhaber → isOwner=false strippt partner_purchase_price,
  // partner_selling_price und partner_commission.
  const contract = redactContractPartner(data as Contract, false);

  return NextResponse.json({ ok: true, contract });
};
