import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { portalBaseUrl } from "@/lib/portal-auth";

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

// E-Mail-Versand wurde entfernt. Diese Route liefert den Check-in-Link zurück,
// den der Betreiber dem Kunden selbst zukommen lässt (z. B. WhatsApp/SMS).
export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select("id, contract_nr, customer_id, renter_email, customers(email)")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  if (!contract.customer_id)
    return NextResponse.json(
      {
        error:
          "Vertrag ist keinem Kundenkonto zugeordnet. Bitte zuerst Kunden in den Vertrag eintragen.",
      },
      { status: 400 }
    );

  type Cust = { email?: string | null };
  const custRel = contract.customers as Cust | Cust[] | null;
  const cust: Cust = Array.isArray(custRel) ? custRel[0] ?? {} : custRel ?? {};
  const email = (cust.email ?? contract.renter_email ?? "").trim().toLowerCase();
  const link = `${portalBaseUrl()}/portal/contracts/${contract.id}`;

  return NextResponse.json({ ok: true, link, customer_email: email || null });
};
