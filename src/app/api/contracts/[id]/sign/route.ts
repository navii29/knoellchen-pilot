import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateContractPdf } from "@/lib/contract-pdf";
import type { Contract, Organization } from "@/lib/types";
import { isPngDataUrl } from "@/lib/utils";
import {
  loadCurrentTireForVehicle,
  loadCustomerForContract,
  loadLogoBase64,
  loadSpecialTermsForContract,
  loadVehicleForContract,
} from "@/lib/contract-loaders";

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

type Ctx = { params: { id: string } };

const extractIp = (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
};

export const POST = async (req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    signature_data?: string;
  };

  const sig = body.signature_data;
  if (!isPngDataUrl(sig)) {
    return NextResponse.json(
      { error: "Ungültige Unterschrift (erwartet: data:image/png;base64,…)" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: contract } = await admin
    .from("contracts")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });
  const c = contract as Contract;
  if (c.signed_at) {
    return NextResponse.json(
      { error: "Vertrag wurde bereits unterschrieben.", signed_at: c.signed_at },
      { status: 409 }
    );
  }

  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", auth.org_id)
    .single();
  if (!org) return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });
  const orgRow = org as Organization;

  const [customer, vehicle, specialTerms, logoPngBase64] = await Promise.all([
    loadCustomerForContract(admin, auth.org_id, c.customer_id),
    loadVehicleForContract(admin, auth.org_id, c.vehicle_id, c.plate),
    loadSpecialTermsForContract(admin, auth.org_id, c.selected_special_terms),
    loadLogoBase64(admin, orgRow.logo_path),
  ]);
  const tires = await loadCurrentTireForVehicle(admin, vehicle?.id ?? null);

  const signedAt = new Date().toISOString();
  const signedIp = extractIp(req);

  // Kontrakt-Snapshot inklusive signed_at/ip für die Audit-Zeile auf Seite 3
  const snapshot: Contract = {
    ...c,
    signed_at: signedAt,
    signed_ip: signedIp,
  };

  const pdfBuf = await generateContractPdf({
    org: orgRow,
    contract: snapshot,
    customer,
    vehicle,
    tires,
    logoPngBase64,
    signaturePngBase64: sig,
    specialTerms,
    brandColor: orgRow.brand_color,
  });

  const stamp = Date.now().toString(36);
  const path = `${auth.org_id}/${c.id}/${stamp}.pdf`;
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
    .eq("org_id", auth.org_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    signed_at: signedAt,
    signed_contract_path: path,
  });
};
