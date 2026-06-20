import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import {
  importCustomerFromOrder,
  processOrder,
  processProduct,
  type ShopifyOrder,
  type ShopifyProduct,
} from "@/lib/shopify";

/**
 * Shopify-Webhook:
 *  - orders/create | orders/paid  → Kunde + Vertrag (Mietzeitraum aus Properties)
 *  - products/create              → Fahrzeug (SKU = Kennzeichen) inkl. Fotos
 *
 * Die eigentliche Logik liegt in src/lib/shopify.ts und wird vom Erst-Import
 * (/api/shopify/import) mitbenutzt.
 *
 * Sicherheit (eine der beiden Varianten konfigurieren):
 *  - SHOPIFY_WEBHOOK_SECRET: HMAC-Prüfung über X-Shopify-Hmac-Sha256
 *  - SHOPIFY_WEBHOOK_TOKEN:  ?token=… in der Callback-URL
 * Organisation: ?org=<uuid>, Fallback SHOPIFY_DEFAULT_ORG_ID.
 * Test: ?dryrun=1 parst und mappt, schreibt aber nichts.
 */

const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

/**
 * Auth-Reihenfolge:
 *  1) Org-eigener Webhook-Token (Self-Service, in den Einstellungen generiert)
 *  2) Globales HMAC-Secret (Env)
 *  3) Globaler URL-Token (Env)
 */
const verifyAuth = (
  rawBody: string,
  req: Request,
  url: URL,
  orgToken: string | null
): { ok: boolean; mode: string } => {
  const provided = url.searchParams.get("token") ?? "";

  if (orgToken && provided && safeEqual(provided, orgToken)) {
    return { ok: true, mode: "org-token" };
  }

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-shopify-hmac-sha256") ?? "";
    const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    try {
      if (safeEqual(digest, header)) return { ok: true, mode: "hmac" };
    } catch {
      /* fallthrough */
    }
  }

  const envToken = process.env.SHOPIFY_WEBHOOK_TOKEN;
  if (envToken && provided && safeEqual(provided, envToken)) {
    return { ok: true, mode: "token" };
  }

  const anyConfigured = Boolean(orgToken || secret || envToken);
  return { ok: false, mode: anyConfigured ? "denied" : "unconfigured" };
};

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  const rawBody = await req.text();
  const admin = createAdminClient();

  // Organisation zuerst auflösen — ihr Webhook-Token ist der primäre Auth-Weg.
  const orgId = url.searchParams.get("org") ?? process.env.SHOPIFY_DEFAULT_ORG_ID ?? null;
  if (!orgId) return NextResponse.json({ error: "Keine Organisation (?org=…)" }, { status: 400 });

  const { data: org } = await admin
    .from("organizations")
    .select("id, shopify_webhook_token")
    .eq("id", orgId)
    .maybeSingle();

  const auth = verifyAuth(rawBody, req, url, org?.shopify_webhook_token ?? null);
  if (!auth.ok) {
    const status = auth.mode === "unconfigured" ? 503 : 401;
    return NextResponse.json(
      { error: auth.mode === "unconfigured" ? "Webhook nicht konfiguriert" : "Ungültige Signatur" },
      { status }
    );
  }
  if (!org) return NextResponse.json({ error: "Organisation unbekannt" }, { status: 400 });

  const topic = req.headers.get("x-shopify-topic") ?? "orders/create";
  const isOrder = /^orders\/(create|paid)$/.test(topic);
  const isProduct = topic === "products/create";
  if (!isOrder && !isProduct) {
    return NextResponse.json({ ok: true, skipped: `Topic ${topic} wird ignoriert` });
  }

  let payload: { id?: number | string };
  try {
    payload = JSON.parse(rawBody) as { id?: number | string };
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  if (!payload?.id) return NextResponse.json({ error: "Keine ID im Payload" }, { status: 400 });

  const dryrun = url.searchParams.get("dryrun") === "1";

  // ── products/create: neues Shop-Produkt → Fahrzeug ──
  // allowPlaceholder: auch Abo-Modelle ohne Kennzeichen-SKU werden als Fahrzeug
  // angelegt (Platzhalter ABO-####) — analog zum Erst-Import.
  if (isProduct) {
    const r = await processProduct(admin, orgId, payload as ShopifyProduct, dryrun, {
      allowPlaceholder: true,
    });
    switch (r.kind) {
      case "skipped":
        return NextResponse.json({ ok: true, skipped: r.reason, product: r.product });
      case "dryrun":
        return NextResponse.json({ ok: true, dryrun: true, mapped: r.mapped });
      case "duplicate":
        return NextResponse.json({ ok: true, duplicate: true, plate: r.plate });
      case "linked":
        return NextResponse.json({ ok: true, linked: true, plate: r.plate, mapped: r.mapped });
      case "created":
        return NextResponse.json({
          ok: true,
          vehicle_id: r.vehicle_id,
          mapped: r.mapped,
          photos: r.photos,
        });
      case "error":
        return NextResponse.json({ error: r.message }, { status: 500 });
    }
  }

  // ── orders/create|paid: Bestellung → Kunde (immer) + Vertrag (bei Mietzeitraum) ──
  const order = payload as ShopifyOrder;
  const cust = await importCustomerFromOrder(admin, orgId, order, dryrun);
  if (cust.kind === "error") return NextResponse.json({ error: cust.message }, { status: 500 });

  const r = await processOrder(admin, orgId, order, dryrun);
  if (r.kind === "error") return NextResponse.json({ error: r.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    customer: cust.kind,
    contract: r.kind,
    ...(r.kind === "created" ? { contract_nr: r.contract_nr } : {}),
    ...(r.kind === "skipped" ? { contract_skipped: r.reason } : {}),
  });
};
