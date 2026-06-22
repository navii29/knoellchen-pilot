import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { resolveCustomerNaming } from "@/lib/customer";

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
  if (v === undefined) return undefined;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

const FIELDS = [
  "salutation",
  "title",
  "first_name",
  "last_name",
  "birthday",
  "street",
  "house_nr",
  "zip",
  "city",
  "country",
  "email",
  "phone",
  "license_nr",
  "license_class",
  "license_expiry",
  "id_card_nr",
  "notes",
] as const;
// license_photo_path / id_card_photo_path sind BEWUSST nicht in FIELDS: sie
// halten Storage-Pfade und dürfen nicht über den generischen PATCH gesetzt
// werden (sonst Cross-Tenant-Zugriff). Upload/Ersetzen läuft ausschließlich
// über /api/customers/[id]/document (Pfad serverseitig & org-scoped vergeben).

type RouteCtx = { params: { id: string } };

export const GET = async (_req: Request, { params }: RouteCtx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .select("*")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ customer: data });
};

export const PATCH = async (req: Request, { params }: RouteCtx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  // Firmenkunde-Namensfelder: kommen immer als Set aus dem Formular (customer_type
  // gesetzt). last_name wird dann aus Firmenname/Rechtsform abgeleitet.
  let namingApplied = false;
  if ("customer_type" in body) {
    const naming = resolveCustomerNaming(body);
    if ("error" in naming) {
      return NextResponse.json({ error: naming.error }, { status: 400 });
    }
    patch.customer_type = naming.customer_type;
    patch.company_name = naming.company_name;
    patch.legal_form = naming.legal_form;
    patch.last_name = naming.last_name;
    if (naming.customer_type === "firma") patch.first_name = null;
    namingApplied = true;
  }

  for (const k of FIELDS) {
    if (namingApplied && (k === "last_name" || k === "first_name")) continue;
    if (k in body) {
      const v = trimOrNull(body[k]);
      if (v !== undefined) patch[k] = v;
    }
  }
  // Marketing-Einwilligung (Boolean) — mit Audit-Stempel, analog zum Portal.
  if ("marketing_opt_in" in body) {
    patch.marketing_opt_in = Boolean(body.marketing_opt_in);
    patch.consent_at = new Date().toISOString();
    patch.consent_source = "dashboard";
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .update(patch)
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });
  return NextResponse.json({ ok: true, customer: data });
};

export const DELETE = async (_req: Request, { params }: RouteCtx) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createAdminClient();

  // GDPR Art. 17: zuerst die sensiblen Ausweis-/Führerschein-Dateien aus dem
  // Storage löschen (sonst bleiben sie als verwaiste Objekte für immer liegen).
  const { data: cust } = await admin
    .from("customers")
    .select("license_photo_path, id_card_photo_path")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .maybeSingle();
  if (!cust) return NextResponse.json({ error: "Kunde nicht gefunden" }, { status: 404 });

  const docPaths = [cust.license_photo_path, cust.id_card_photo_path].filter(
    (p): p is string => typeof p === "string" && p.length > 0
  );
  if (docPaths.length > 0) {
    await admin.storage.from("customer-documents").remove(docPaths);
  }

  // Portal-Logins werden per ON DELETE CASCADE entfernt; Verträge behalten ihren
  // renter_name-Snapshot (FK ist ON DELETE SET NULL, Aufbewahrungspflicht).
  const { error } = await admin
    .from("customers")
    .delete()
    .eq("id", params.id)
    .eq("org_id", auth.org_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
};
