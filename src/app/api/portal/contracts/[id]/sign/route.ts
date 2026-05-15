import { NextResponse } from "next/server";
import { getPortalSession, ipFromHeaders } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateContractPdf } from "@/lib/contract-pdf";
import type { Contract, Organization } from "@/lib/types";
import {
  loadCurrentTireForVehicle,
  loadCustomerForContract,
  loadSpecialTermsForContract,
  loadVehicleForContract,
} from "@/lib/contract-loaders";

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

export const maxDuration = 30;

type Ctx = { params: { id: string } };

export const POST = async (req: Request, { params }: Ctx) => {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { signature_data?: string };
  const sig = body.signature_data;
  if (!sig || !sig.startsWith("data:image/png;base64,")) {
    return NextResponse.json(
      { error: "Ungültige Unterschrift" },
      { status: 400 }
    );
  }

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
  if (c.signed_at) {
    return NextResponse.json({ error: "Bereits unterschrieben" }, { status: 409 });
  }

  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", session.org_id)
    .single();
  if (!org)
    return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });
  const orgRow = org as Organization;

  const [customer, vehicle, specialTerms, logoPngBase64] = await Promise.all([
    loadCustomerForContract(admin, session.org_id, session.customer_id),
    loadVehicleForContract(admin, session.org_id, c.vehicle_id, c.plate),
    loadSpecialTermsForContract(admin, session.org_id, c.selected_special_terms),
    loadLogoBase64(admin, orgRow.logo_path),
  ]);
  const tires = await loadCurrentTireForVehicle(admin, vehicle?.id ?? null);

  const signedAt = new Date().toISOString();
  const signedIp = ipFromHeaders();

  const snapshot: Contract = { ...c, signed_at: signedAt, signed_ip: signedIp };

  const pdfBuf = await generateContractPdf({
    org: orgRow,
    contract: snapshot,
    customer,
    vehicle,
    tires,
    logoPngBase64,
    signaturePngBase64: sig,
    specialTerms,
  });

  const stamp = Date.now().toString(36);
  const path = `${session.org_id}/${c.id}/${stamp}.pdf`;
  const { error: upErr } = await admin.storage
    .from("generated-docs")
    .upload(path, pdfBuf, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { error: updErr } = await admin
    .from("contracts")
    .update({
      signed_contract_path: path,
      signature_data: sig,
      signed_at: signedAt,
      signed_ip: signedIp,
    })
    .eq("id", c.id)
    .eq("org_id", session.org_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, signed_at: signedAt });
};
