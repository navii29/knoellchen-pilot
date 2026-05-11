import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { generateContractPdf } from "@/lib/contract-pdf";
import type { Contract, Customer, Organization, Vehicle } from "@/lib/types";

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

// Liefert das PDF live als Stream — wenn der Vertrag bereits unterschrieben ist,
// wird die finale signierte Version aus dem Storage zurückgegeben (Redirect auf
// signed URL); sonst wird on-the-fly eine Vorschau ohne Unterschrift generiert.
export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

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

  // Bereits signiert → signed URL aus Storage
  if (c.signed_contract_path) {
    const { data: signed } = await admin.storage
      .from("generated-docs")
      .createSignedUrl(c.signed_contract_path, 60 * 5);
    if (signed?.signedUrl) return NextResponse.redirect(signed.signedUrl, { status: 302 });
  }

  // Vorschau on-the-fly
  const [{ data: org }, customerRes, vehicleRes] = await Promise.all([
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
  ]);

  if (!org) return NextResponse.json({ error: "Organisation fehlt" }, { status: 500 });

  const buf = generateContractPdf({
    org: org as Organization,
    contract: c,
    customer: (customerRes.data ?? null) as Customer | null,
    vehicle: (vehicleRes.data ?? null) as Vehicle | null,
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
