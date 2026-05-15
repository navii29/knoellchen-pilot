import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateContractPdf } from "@/lib/contract-pdf";
import type { Contract, Organization } from "@/lib/types";
import {
  loadCurrentTireForVehicle,
  loadCustomerForContract,
  loadSpecialTermsForContract,
  loadVehicleForContract,
} from "@/lib/contract-loaders";

export const maxDuration = 30;

const loadLogoBase64 = async (
  admin: ReturnType<typeof createAdminClient>,
  logoPath: string | null | undefined
): Promise<string | null> => {
  if (!logoPath) return null;
  if (logoPath.toLowerCase().endsWith(".svg")) return null;
  const { data, error } = await admin.storage.from("brand").download(logoPath);
  if (error || !data) return null;
  const mime =
    logoPath.toLowerCase().endsWith(".jpg") ||
    logoPath.toLowerCase().endsWith(".jpeg")
      ? "image/jpeg"
      : "image/png";
  const buf = Buffer.from(await data.arrayBuffer());
  return `data:${mime};base64,${buf.toString("base64")}`;
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

  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", session.org_id)
    .single();
  if (!org)
    return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });
  const orgRow = org as Organization;

  // Portal: customer ist immer der eingeloggte Portal-Kunde, nicht via
  // contract.customer_id ableitbar (der könnte abweichen falls neu zugeordnet).
  const [customer, vehicle, specialTerms, logoPngBase64] = await Promise.all([
    loadCustomerForContract(admin, session.org_id, session.customer_id),
    loadVehicleForContract(admin, session.org_id, c.vehicle_id, c.plate),
    loadSpecialTermsForContract(admin, session.org_id, c.selected_special_terms),
    loadLogoBase64(admin, orgRow.logo_path),
  ]);
  const tires = await loadCurrentTireForVehicle(admin, vehicle?.id ?? null);

  const buf = await generateContractPdf({
    org: orgRow,
    contract: c,
    customer,
    vehicle,
    tires,
    logoPngBase64,
    specialTerms,
  });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="mietvertrag-${c.contract_nr}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
};
