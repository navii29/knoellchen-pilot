import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
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
  if (
    !sig ||
    typeof sig !== "string" ||
    !sig.startsWith("data:image/png;base64,")
  ) {
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

  const [{ data: org }, customerRes, vehicleRes, tireRes] = await Promise.all([
    admin.from("organizations").select("*").eq("id", auth.org_id).single(),
    c.customer_id
      ? admin
          .from("customers")
          .select("*")
          .eq("id", c.customer_id)
          .eq("org_id", auth.org_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    c.vehicle_id
      ? admin
          .from("vehicles")
          .select("*")
          .eq("id", c.vehicle_id)
          .eq("org_id", auth.org_id)
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

  if (!org) return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });
  const orgRow = org as Organization;
  const logoPngBase64 = await loadLogoBase64(admin, orgRow.logo_path);

  const signedAt = new Date().toISOString();
  const signedIp = extractIp(req);

  // Kontrakt-Snapshot inklusive signed_at/ip für die Audit-Zeile auf Seite 3
  const snapshot: Contract = {
    ...c,
    signed_at: signedAt,
    signed_ip: signedIp,
  };

  const pdfBuf = generateContractPdf({
    org: orgRow,
    contract: snapshot,
    customer: (customerRes.data ?? null) as Customer | null,
    vehicle: (vehicleRes.data ?? null) as Vehicle | null,
    tires: (tireRes.data ?? null) as VehicleTire | null,
    logoPngBase64,
    signaturePngBase64: sig,
  });

  const stamp = Date.now().toString(36);
  const path = `${auth.org_id}/${c.id}/${stamp}.pdf`;
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
    .eq("org_id", auth.org_id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    signed_at: signedAt,
    signed_contract_path: path,
  });
};
