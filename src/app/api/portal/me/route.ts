import { NextResponse } from "next/server";
import { getPortalCustomer } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";

export const GET = async () => {
  const ctx = await getPortalCustomer();
  if (!ctx) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, street, zip, city, phone, email")
    .eq("id", ctx.session.org_id)
    .single();

  return NextResponse.json({
    ok: true,
    customer: ctx.customer,
    org,
  });
};
