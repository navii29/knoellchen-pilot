import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { normalizePlate } from "@/lib/plate";

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

// Liefert für ein Kennzeichen + Partner-ID den hinterlegten Einstands- und
// VK-Preis. Gibt 404 wenn nicht hinterlegt — der Client trägt dann manuell ein.
export const GET = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(req.url);
  const plateRaw = url.searchParams.get("plate");
  const partnerId = url.searchParams.get("partner_id");
  if (!plateRaw || !partnerId)
    return NextResponse.json({ error: "plate und partner_id erforderlich" }, { status: 400 });

  const plate = normalizePlate(plateRaw);
  if (!plate) return NextResponse.json({ error: "Kennzeichen ungültig" }, { status: 400 });

  const admin = createAdminClient();
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("org_id", auth.org_id)
    .eq("plate", plate)
    .maybeSingle();

  if (!vehicle) {
    return NextResponse.json({
      ok: true,
      vehicle_known: false,
      pricing: null,
    });
  }

  const { data: pricing } = await admin
    .from("vehicle_partner_pricing")
    .select("purchase_price, selling_price")
    .eq("vehicle_id", vehicle.id)
    .eq("partner_id", partnerId)
    .eq("org_id", auth.org_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    vehicle_known: true,
    pricing: pricing
      ? {
          purchase_price: Number(pricing.purchase_price),
          selling_price: Number(pricing.selling_price),
        }
      : null,
  });
};
