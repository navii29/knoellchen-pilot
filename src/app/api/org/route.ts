import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/team";

/** Rekursiv alle Storage-Objekte unter `${orgId}/` eines Buckets löschen. */
const removeOrgFolder = async (
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  orgId: string
) => {
  const toRemove: string[] = [];
  const walk = async (prefix: string) => {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error || !data) return;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      // Ordner haben keine id; Dateien schon.
      if ((item as { id: string | null }).id === null) await walk(path);
      else toRemove.push(path);
    }
  };
  await walk(orgId);
  for (let i = 0; i < toRemove.length; i += 100) {
    await admin.storage.from(bucket).remove(toRemove.slice(i, i + 100));
  }
};

const ALL_BUCKETS = [
  "ticket-uploads",
  "generated-docs",
  "customer-documents",
  "handover-photos",
  "tire-photos",
  "vehicle-documents",
  "vehicle-photos",
  "brand",
];

const SAFE_COLUMNS =
  "id, name, street, zip, city, phone, email, tax_number, processing_fee, slug, inbound_email, sender_name, sender_email, email_automation_enabled, lexoffice_enabled, echoes_account_id, echoes_enabled, rental_terms, onboarding_completed, onboarding_step, shopify_shop_domain, shopify_webhook_token, created_at";

const stripSecrets = <T extends Record<string, unknown>>(row: T) => {
  const copy = { ...row } as T & {
    lexoffice_api_key?: string;
    echoes_api_key?: string;
    shopify_admin_token?: string;
  };
  delete copy.lexoffice_api_key;
  delete copy.echoes_api_key;
  delete copy.shopify_admin_token;
  return copy as Omit<T, "lexoffice_api_key" | "echoes_api_key" | "shopify_admin_token">;
};

/**
 * Shop-Domain normalisieren + validieren. Die Admin-API läuft ausschließlich
 * über *.myshopify.com — das ist gleichzeitig der SSRF-Schutz für den Import
 * (Nutzer können den Server nicht auf interne Adressen zeigen lassen).
 */
const normalizeShopDomain = (raw: string): string | null => {
  const d = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!d) return null;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(d) ? d : null;
};

export const PATCH = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const allowed = [
    "name",
    "street",
    "zip",
    "city",
    "phone",
    "email",
    "tax_number",
    "processing_fee",
    "iban",
    "bic",
    "account_holder",
    "kleinunternehmer",
    "lexoffice_api_key",
    "lexoffice_enabled",
    "echoes_api_key",
    "echoes_account_id",
    "echoes_enabled",
    "rental_terms",
    "shopify_shop_domain",
    "shopify_admin_token",
  ];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) update[k] = body[k];
  if ("processing_fee" in update) update.processing_fee = Number(update.processing_fee);
  if ("kleinunternehmer" in update)
    update.kleinunternehmer = Boolean(update.kleinunternehmer);
  if ("lexoffice_enabled" in update)
    update.lexoffice_enabled = Boolean(update.lexoffice_enabled);
  if ("lexoffice_api_key" in update) {
    const v = update.lexoffice_api_key;
    update.lexoffice_api_key =
      typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  }
  if ("echoes_enabled" in update)
    update.echoes_enabled = Boolean(update.echoes_enabled);
  if ("echoes_api_key" in update) {
    const v = update.echoes_api_key;
    update.echoes_api_key =
      typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  }
  if ("echoes_account_id" in update) {
    const v = update.echoes_account_id;
    update.echoes_account_id =
      typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  }
  if ("shopify_shop_domain" in update) {
    const v = update.shopify_shop_domain;
    if (typeof v === "string" && v.trim().length > 0) {
      const normalized = normalizeShopDomain(v);
      if (!normalized) {
        return NextResponse.json(
          { error: "Ungültige Shop-Domain — erwartet wird z. B. mein-shop.myshopify.com" },
          { status: 400 }
        );
      }
      update.shopify_shop_domain = normalized;
    } else {
      update.shopify_shop_domain = null;
    }
  }
  if ("shopify_admin_token" in update) {
    const v = update.shopify_admin_token;
    update.shopify_admin_token =
      typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  }

  const admin = createAdminClient();

  // Webhook-Token einmalig generieren, sobald Shopify konfiguriert wird —
  // damit hat jede Organisation ihre eigene, abgesicherte Webhook-URL.
  if (update.shopify_shop_domain || update.shopify_admin_token) {
    const { data: existing } = await admin
      .from("organizations")
      .select("shopify_webhook_token")
      .eq("id", profile.org_id)
      .single();
    if (!existing?.shopify_webhook_token) {
      update.shopify_webhook_token = randomBytes(24).toString("hex");
    }
  }
  const { data, error } = await admin
    .from("organizations")
    .update(update)
    .eq("id", profile.org_id)
    .select(SAFE_COLUMNS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hinweis: SAFE_COLUMNS enthält bereits keine api_key-Spalte; stripSecrets ist
  // doppelter Schutz für den Fall, dass jemand SAFE_COLUMNS später erweitert.
  return NextResponse.json({
    ok: true,
    org: stripSecrets(data),
    lexoffice_has_key: false,
    echoes_has_key: false,
  });
};

export const GET = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select(`${SAFE_COLUMNS}, lexoffice_api_key, echoes_api_key`)
    .eq("id", profile.org_id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = data as Record<string, unknown>;
  const lexofficeHasKey =
    typeof row.lexoffice_api_key === "string" &&
    (row.lexoffice_api_key as string).length > 0;
  const echoesHasKey =
    typeof row.echoes_api_key === "string" &&
    (row.echoes_api_key as string).length > 0;

  return NextResponse.json({
    ok: true,
    org: stripSecrets(row),
    lexoffice_has_key: lexofficeHasKey,
    echoes_has_key: echoesHasKey,
  });
};

/**
 * DSGVO Art. 17 — Konto-Löschung (Selbstbedienung). Nur Inhaber.
 * Erfordert Bestätigung durch exakte Eingabe des Firmennamens. Löscht alle
 * Storage-Objekte der Org, dann atomar alle DB-Daten (delete_org), dann die
 * Auth-User. Unwiderruflich.
 */
export const DELETE = async (req: Request) => {
  const me = await getMembership();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "owner")
    return NextResponse.json({ error: "Nur Inhaber können das Konto löschen." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  const admin = createAdminClient();

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", me.orgId)
    .single();
  if (!org) return NextResponse.json({ error: "Organisation nicht gefunden" }, { status: 404 });
  if ((body.confirm ?? "").trim() !== (org.name ?? "").trim()) {
    return NextResponse.json(
      { error: "Zur Bestätigung bitte den Firmennamen exakt eingeben." },
      { status: 400 }
    );
  }

  // Alle Auth-User der Org einsammeln (vor der Löschung von public.users).
  const { data: members } = await admin.from("users").select("id").eq("org_id", me.orgId);
  const userIds = (members ?? []).map((m) => m.id as string);

  // 1) Storage leeren (alle Buckets, Präfix orgId/).
  for (const b of ALL_BUCKETS) {
    await removeOrgFolder(admin, b, me.orgId).catch(() => {});
  }

  // 2) Alle DB-Daten atomar löschen (inkl. organizations + public.users).
  const { error } = await admin.rpc("delete_org", { p_org: me.orgId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3) Auth-User entfernen (public.users ist jetzt weg → FK frei).
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }

  return NextResponse.json({ ok: true });
};
