import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ ok: true, contract: data });
};
