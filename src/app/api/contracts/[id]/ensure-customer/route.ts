import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { buildCustomerFromContract, matchCustomerId } from "@/lib/contract-takeover";

// Stellt sicher, dass ein Vertrag einen verknüpften Kundendatensatz hat —
// legt bei Bedarf aus den Mieter-Snapshot-Daten einen Kunden an und verknüpft
// ihn (customer_id). Voraussetzung für Portal-Zugang / Self-Check-in.
//
// Matching-Reihenfolge: ① Führerschein-Nr → ② Name+Geburtstag → ③ E-Mail
// (historischer Fallback) → ④ neu anlegen.
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

type Ctx = { params: { id: string } };

export const POST = async (_req: Request, { params }: Ctx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from("contracts")
    .select(
      "id, customer_id, renter_name, renter_email, renter_phone, renter_address, renter_birthday, renter_birthplace, renter_license_nr, renter_license_class, renter_license_expiry, renter_license_issued, renter_id_card_nr, renter_id_card_authority, renter_iban, renter_bank_holder"
    )
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!contract)
    return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 });

  // Idempotenz: bereits verknüpft → nichts tun.
  if (contract.customer_id)
    return NextResponse.json({ ok: true, customer_id: contract.customer_id, created: false });

  const email = (contract.renter_email ?? "").trim().toLowerCase() || null;
  const name = (contract.renter_name ?? "").trim();
  if (!name && !email)
    return NextResponse.json(
      { error: "Keine Mieterdaten vorhanden, um einen Kunden anzulegen." },
      { status: 400 }
    );

  // ①/② FS-Nr bzw. Name+Geburtstag gegen bestehende Kunden der Org matchen.
  const { data: existing } = await admin
    .from("customers")
    .select("id, license_nr, first_name, last_name, birthday")
    .eq("org_id", auth.org_id);
  const pool = (existing ?? []) as {
    id: string;
    license_nr: string | null;
    first_name: string | null;
    last_name: string | null;
    birthday: string | null;
  }[];

  let customerId = matchCustomerId(
    { license_nr: contract.renter_license_nr, name, birthday: contract.renter_birthday },
    pool
  );

  // ③ Historischer E-Mail-Fallback (nicht regressiv entfernen).
  if (!customerId && email) {
    const escaped = email.replace(/[\\%_]/g, "\\$&");
    const { data } = await admin
      .from("customers")
      .select("id")
      .eq("org_id", auth.org_id)
      .ilike("email", escaped)
      .maybeSingle();
    customerId = data?.id ?? null;
  }

  // ④ Sonst neu anlegen (normalisierte Felder, last_name Pflicht → Fallback).
  let created = false;
  if (!customerId) {
    const cand = buildCustomerFromContract(contract);
    const { data: ins, error } = await admin
      .from("customers")
      .insert({ org_id: auth.org_id, ...cand, last_name: cand.last_name || name || "Mieter" })
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
