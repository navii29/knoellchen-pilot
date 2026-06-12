import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import {
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

const verifyAuth = (rawBody: string, req: Request, url: URL): { ok: boolean; mode: string } => {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (secret) {
    const header = req.headers.get("x-shopify-hmac-sha256") ?? "";
    const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    try {
      const a = Buffer.from(digest);
      const b = Buffer.from(header);
      if (a.length === b.length && timingSafeEqual(a, b)) return { ok: true, mode: "hmac" };
    } catch {
      /* fallthrough */
    }
    return { ok: false, mode: "hmac" };
  }
  const token = process.env.SHOPIFY_WEBHOOK_TOKEN;
  if (token) {
    return { ok: url.searchParams.get("token") === token, mode: "token" };
  }
  return { ok: false, mode: "unconfigured" };
};

export const POST = async (req: Request) => {
  const url = new URL(req.url);
  const rawBody = await req.text();

  const auth = verifyAuth(rawBody, req, url);
  if (!auth.ok) {
    const status = auth.mode === "unconfigured" ? 503 : 401;
    return NextResponse.json(
      { error: auth.mode === "unconfigured" ? "Webhook nicht konfiguriert" : "Ungültige Signatur" },
      { status }
    );
  }

  const topic = req.headers.get("x-shopify-topic") ?? "orders/create";
  const isOrder = /^orders\/(create|paid)$/.test(topic);
  const isProduct = topic === "products/create";
  if (!isOrder && !isProduct) {
    return NextResponse.json({ ok: true, skipped: `Topic ${topic} wird ignoriert` });
  }

  const orgId = url.searchParams.get("org") ?? process.env.SHOPIFY_DEFAULT_ORG_ID ?? null;
  if (!orgId) return NextResponse.json({ error: "Keine Organisation (?org=…)" }, { status: 400 });

  let payload: { id?: number | string };
  try {
    payload = JSON.parse(rawBody) as { id?: number | string };
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  if (!payload?.id) return NextResponse.json({ error: "Keine ID im Payload" }, { status: 400 });

  const dryrun = url.searchParams.get("dryrun") === "1";
  const admin = createAdminClient();

  // Organisation validieren
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return NextResponse.json({ error: "Organisation unbekannt" }, { status: 400 });

  // ── products/create: neues Shop-Produkt → Fahrzeug ──
  if (isProduct) {
    const r = await processProduct(admin, orgId, payload as ShopifyProduct, dryrun);
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

  // ── orders/create|paid: Bestellung → Kunde + Vertrag ──
  const r = await processOrder(admin, orgId, payload as ShopifyOrder, dryrun);
  switch (r.kind) {
    case "skipped":
      return NextResponse.json({ ok: true, skipped: r.reason, order: r.order });
    case "dryrun":
      return NextResponse.json({ ok: true, dryrun: true, mapped: r.mapped });
    case "duplicate":
      return NextResponse.json({ ok: true, duplicate: true, contract_nr: r.contract_nr });
    case "created":
      return NextResponse.json({
        ok: true,
        contract_nr: r.contract_nr,
        customer_id: r.customer_id,
        mapped: r.mapped,
      });
    case "error":
      return NextResponse.json({ error: r.message }, { status: 500 });
  }
};
