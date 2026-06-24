import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { resolveCustomerNaming } from "@/lib/customer";
import { requirePermission } from "@/lib/team";

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

const trimOrNull = (v: unknown) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

// DATE-Spalten (birthday/license_expiry) dürfen NUR ein gültiges ISO-Datum oder
// null erhalten. OCR/manuelle Eingaben wie "30.05.1990", "1990" oder "unbekannt"
// würden sonst beim INSERT einen Postgres-"invalid input syntax for type date"
// auslösen und die KOMPLETTE Kundenanlage mit 500 abbrechen. Deutsches
// DD.MM.YYYY wird konvertiert; alles andere -> null (Feld bleibt leer).
const toIsoDateOrNull = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t === "") return null;
  const de = t.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  const iso = de ? `${de[3]}-${de[2]}-${de[1]}` : t;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  // Round-trip-Check: fängt unmögliche Daten wie 2024-02-31 ab.
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10) === iso ? iso : null;
};

export const GET = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("last_name", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data ?? [] });
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gate = await requirePermission("create_master_data");
  if (!gate.ok) return gate.res;

  const body = (await req.json()) as Record<string, unknown>;
  const naming = resolveCustomerNaming(body);
  if ("error" in naming) {
    return NextResponse.json({ error: naming.error }, { status: 400 });
  }

  const insertRow = {
    org_id: auth.org_id,
    customer_type: naming.customer_type,
    company_name: naming.company_name,
    legal_form: naming.legal_form,
    salutation: trimOrNull(body.salutation),
    title: trimOrNull(body.title),
    // first_name bleibt erhalten (z. B. Ansprechpartner); customerDisplayName nutzt
    // bei Firmen ohnehin den Firmennamen, nicht den Vornamen.
    first_name: trimOrNull(body.first_name),
    last_name: naming.last_name,
    birthday: toIsoDateOrNull(body.birthday),
    street: trimOrNull(body.street),
    house_nr: trimOrNull(body.house_nr),
    zip: trimOrNull(body.zip),
    city: trimOrNull(body.city),
    country: trimOrNull(body.country) ?? "Deutschland",
    email: trimOrNull(body.email),
    phone: trimOrNull(body.phone),
    license_nr: trimOrNull(body.license_nr),
    license_class: trimOrNull(body.license_class),
    license_expiry: toIsoDateOrNull(body.license_expiry),
    id_card_nr: trimOrNull(body.id_card_nr),
    license_photo_path: trimOrNull(body.license_photo_path),
    license_photo_back_path: trimOrNull(body.license_photo_back_path),
    id_card_photo_path: trimOrNull(body.id_card_photo_path),
    id_card_photo_back_path: trimOrNull(body.id_card_photo_back_path),
    notes: trimOrNull(body.notes),
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .insert(insertRow)
    .select("*")
    .single();
  if (error) {
    // Rohfehler nur serverseitig loggen — nie an den Client leaken (kann
    // Spaltennamen/Constraints preisgeben).
    console.error("customers POST insert failed:", error);
    return NextResponse.json({ error: "Kunde konnte nicht angelegt werden" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, customer: data });
};
