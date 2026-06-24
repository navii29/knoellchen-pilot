import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { myRole, ownerOnly } from "@/lib/team";
import { parseDecimal } from "@/lib/utils";

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

const numOrNull = (v: unknown): number | null => parseDecimal(v);

export const GET = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  // Mitarbeiter sehen keine Partner-Einkaufs-/Verkaufspreise.
  if ((await myRole()) !== "owner") return NextResponse.json({ ok: true, pricing: [] });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vehicle_partner_pricing")
    .select("*, sales_partners!inner(name, type, commission_type, commission_value)")
    .eq("vehicle_id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pricing: data ?? [] });
};

export const POST = async (req: Request, { params }: Ctx) => {
  const gate = await ownerOnly(); // Partner-Preise setzen nur Inhaber
  if (!gate.ok) return gate.res;
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const partner_id = body.partner_id;
  const purchase_price = numOrNull(body.purchase_price);
  const selling_price = numOrNull(body.selling_price);
  if (typeof partner_id !== "string")
    return NextResponse.json({ error: "Partner fehlt" }, { status: 400 });
  if (purchase_price == null || selling_price == null)
    return NextResponse.json({ error: "Beide Preise erforderlich" }, { status: 400 });
  if (purchase_price < 0 || selling_price < 0)
    return NextResponse.json({ error: "Preise müssen ≥ 0 sein" }, { status: 400 });

  const admin = createAdminClient();

  // Vehicle muss zur Org gehören
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!vehicle)
    return NextResponse.json({ error: "Fahrzeug nicht gefunden" }, { status: 404 });

  // Partner muss zur Org gehören
  const { data: partner } = await admin
    .from("sales_partners")
    .select("id")
    .eq("id", partner_id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!partner)
    return NextResponse.json({ error: "Partner nicht gefunden" }, { status: 404 });

  // Upsert (vehicle_id, partner_id) — bestehender Eintrag wird aktualisiert
  const { data, error } = await admin
    .from("vehicle_partner_pricing")
    .upsert(
      {
        vehicle_id: params.id,
        partner_id,
        org_id: auth.org_id,
        purchase_price,
        selling_price,
      },
      { onConflict: "vehicle_id,partner_id" }
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pricing: data });
};
