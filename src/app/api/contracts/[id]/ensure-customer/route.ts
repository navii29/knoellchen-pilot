import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Stellt sicher, dass ein Vertrag einen verknüpften Kundendatensatz hat —
// legt bei Bedarf aus den Mieter-Snapshot-Daten einen Kunden an und verknüpft
// ihn (customer_id). Voraussetzung für Portal-Zugang / Self-Check-in.
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
  return profile ? { user, org_id: profile.org_id as string } : null;
};

const splitName = (full: string): { first: string; last: string } => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: "", last: parts[0] ?? "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
};

type Ctx = { params: { id: string } };

export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select(
      "id, customer_id, renter_name, renter_email, renter_phone, renter_address, renter_birthday, renter_license_nr"
    )
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  if (contract.customer_id)
    return NextResponse.json({ ok: true, customer_id: contract.customer_id, created: false });

  const email = (contract.renter_email ?? "").trim().toLowerCase() || null;
  const name = (contract.renter_name ?? "").trim();
  if (!name && !email)
    return NextResponse.json(
      { error: "Keine Mieterdaten vorhanden, um einen Kunden anzulegen." },
      { status: 400 }
    );

  // 1) bestehenden Kunden per E-Mail finden
  let customerId: string | null = null;
  if (email) {
    const escaped = email.replace(/[\\%_]/g, "\\$&");
    const { data } = await admin
      .from("customers")
      .select("id")
      .eq("org_id", auth.org_id)
      .ilike("email", escaped)
      .maybeSingle();
    customerId = data?.id ?? null;
  }

  // 2) sonst neu anlegen
  let created = false;
  if (!customerId) {
    const { first, last } = splitName(name || "Mieter");
    const { data: ins, error } = await admin
      .from("customers")
      .insert({
        org_id: auth.org_id,
        first_name: first || null,
        last_name: last || name || "Mieter",
        email,
        phone: contract.renter_phone ?? null,
        street: contract.renter_address ?? null,
        birthday: contract.renter_birthday ?? null,
        license_nr: contract.renter_license_nr ?? null,
      })
      .select("id")
      .single();
    if (error || !ins)
      return NextResponse.json(
        { error: "Kunde konnte nicht angelegt werden." },
        { status: 500 }
      );
    customerId = ins.id;
    created = true;
  }

  const { error: linkErr } = await admin
    .from("contracts")
    .update({ customer_id: customerId })
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (linkErr)
    return NextResponse.json({ error: "Verknüpfung fehlgeschlagen." }, { status: 500 });

  return NextResponse.json({ ok: true, customer_id: customerId, created });
};
