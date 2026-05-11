import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateContractPdf } from "@/lib/contract-pdf";
import type { Contract, Customer, Organization, Vehicle } from "@/lib/types";

type Ctx = { params: { id: string } };

export const GET = async (_req: Request, { params }: Ctx) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", session.org_id)
    .eq("customer_id", session.customer_id)
    .maybeSingle();
  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  const c = contract as Contract;

  if (c.signed_contract_path) {
    const { data: signed } = await admin.storage
      .from("generated-docs")
      .createSignedUrl(c.signed_contract_path, 60 * 5);
    if (signed?.signedUrl) return NextResponse.redirect(signed.signedUrl, { status: 302 });
  }

  const [{ data: org }, { data: customer }, { data: vehicle }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", session.org_id).single(),
    admin
      .from("customers")
      .select("*")
      .eq("id", session.customer_id)
      .eq("org_id", session.org_id)
      .maybeSingle(),
    c.vehicle_id
      ? admin
          .from("vehicles")
          .select("*")
          .eq("id", c.vehicle_id)
          .eq("org_id", session.org_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!org)
    return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });

  const buf = generateContractPdf({
    org: org as Organization,
    contract: c,
    customer: (customer ?? null) as Customer | null,
    vehicle: (vehicle ?? null) as Vehicle | null,
  });

  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="mietvertrag-${c.contract_nr}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
};
