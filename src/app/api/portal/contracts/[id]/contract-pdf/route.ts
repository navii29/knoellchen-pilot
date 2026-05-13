import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateContractPdf } from "@/lib/contract-pdf";
import type { Contract, Customer, Organization, Vehicle } from "@/lib/types";
import type { VehicleTire } from "@/lib/tires";

const loadLogoBase64 = async (
  admin: ReturnType<typeof createAdminClient>,
  logoPath: string | null | undefined
): Promise<string | null> => {
  if (!logoPath) return null;
  const { data, error } = await admin.storage.from("brand").download(logoPath);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:image/png;base64,${buf.toString("base64")}`;
};

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

  const [{ data: org }, { data: customer }, { data: vehicle }, { data: tire }] =
    await Promise.all([
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
      c.vehicle_id
        ? admin
            .from("vehicle_tires")
            .select("*")
            .eq("vehicle_id", c.vehicle_id)
            .eq("is_current", true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  if (!org)
    return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });
  const orgRow = org as Organization;
  const logoPngBase64 = await loadLogoBase64(admin, orgRow.logo_path);

  const buf = generateContractPdf({
    org: orgRow,
    contract: c,
    customer: (customer ?? null) as Customer | null,
    vehicle: (vehicle ?? null) as Vehicle | null,
    tires: (tire ?? null) as VehicleTire | null,
    logoPngBase64,
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
