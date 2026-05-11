import { NextResponse } from "next/server";
import { getPortalSession, ipFromHeaders } from "@/lib/portal-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { generateContractPdf } from "@/lib/contract-pdf";
import type { Contract, Customer, Organization, Vehicle } from "@/lib/types";

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

  const signedAt = new Date().toISOString();
  const signedIp = ipFromHeaders();

  const snapshot: Contract = { ...c, signed_at: signedAt, signed_ip: signedIp };

  const pdfBuf = generateContractPdf({
    org: org as Organization,
    contract: snapshot,
    customer: (customer ?? null) as Customer | null,
    vehicle: (vehicle ?? null) as Vehicle | null,
    signaturePngBase64: sig,
  });

  const stamp = Date.now().toString(36);
  const path = `${session.org_id}/${c.id}/${stamp}.pdf`;
  const { error: upErr } = await admin.storage
    .from("generated-docs")
    .upload(path, Buffer.from(pdfBuf), {
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
