import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { nextContractNr } from "@/lib/contract-utils";
import { normalizePlate } from "@/lib/plate";

/**
 * Shopify-Webhook: orders/create (oder orders/paid).
 * Eine Shop-Bestellung mit Mietzeitraum wird automatisch als Kunde + Vertrag
 * im CRM angelegt.
 *
 * Sicherheit (eine der beiden Varianten konfigurieren):
 *  - SHOPIFY_WEBHOOK_SECRET: HMAC-Prüfung über X-Shopify-Hmac-Sha256
 *    (Webhook im Shopify-Admin angelegt)
 *  - SHOPIFY_WEBHOOK_TOKEN:  ?token=… in der Callback-URL
 *    (Webhook per API/MCP angelegt — dort ist kein App-Secret verfügbar)
 *
 * Organisation: ?org=<uuid> in der URL, Fallback SHOPIFY_DEFAULT_ORG_ID.
 *
 * Mapping-Konventionen:
 *  - Fahrzeug: Line-Item-SKU = Kennzeichen (empfohlen), alternativ
 *    Line-Item-Property "Kennzeichen", alternativ Produkt-Titel-Match
 *    gegen Hersteller/Modell der Flotte.
 *  - Zeitraum: Line-Item-Properties oder Note-Attributes mit Schlüsseln wie
 *    Abholdatum/Mietbeginn/Pickup/Von und Rückgabedatum/Mietende/Return/Bis.
 *    Formate: YYYY-MM-DD oder DD.MM.YYYY, optional mit Uhrzeit HH:MM.
 *
 * Test: ?dryrun=1 parst und mappt, schreibt aber nichts.
 */

type KV = { name?: string | null; value?: string | null };

type ShopifyLineItem = {
  title?: string | null;
  sku?: string | null;
  quantity?: number;
  price?: string | null;
  properties?: KV[] | null;
};

type ShopifyOrder = {
  id: number | string;
  name?: string | null; // "#1001"
  order_number?: number | string | null;
  created_at?: string | null;
  note?: string | null;
  note_attributes?: KV[] | null;
  total_price?: string | null;
  currency?: string | null;
  email?: string | null;
  customer?: {
    id?: number | string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
    default_address?: {
      address1?: string | null;
      zip?: string | null;
      city?: string | null;
      country?: string | null;
      phone?: string | null;
    } | null;
  } | null;
  line_items?: ShopifyLineItem[] | null;
};

const START_KEYS = /(abhol|mietbeginn|beginn|pickup|start|^von$|von\b)/i;
const END_KEYS = /(rückgabe|rueckgabe|mietende|ende|return|^bis$|bis\b)/i;
const RANGE_KEYS = /(zeitraum|mietzeitraum|daterange|rental)/i;
const PLATE_KEYS = /(kennzeichen|plate)/i;

/** "12.07.2026", "2026-07-12", jeweils optional mit "14:30". */
const parseDateTime = (raw: string): { date: string; time: string | null } | null => {
  const s = raw.trim();
  const time = s.match(/(\d{1,2}):(\d{2})/);
  const timeStr = time ? `${time[1].padStart(2, "0")}:${time[2]}` : null;

  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, time: timeStr };

  const de = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de)
    return {
      date: `${de[3]}-${de[2].padStart(2, "0")}-${de[1].padStart(2, "0")}`,
      time: timeStr,
    };
  return null;
};

const collectKVs = (order: ShopifyOrder): KV[] => {
  const out: KV[] = [...(order.note_attributes ?? [])];
  for (const li of order.line_items ?? []) out.push(...(li.properties ?? []));
  return out.filter((kv) => kv?.name && kv?.value);
};

const extractPeriod = (
  order: ShopifyOrder
): { pickup: { date: string; time: string | null } | null; ret: { date: string; time: string | null } | null } => {
  const kvs = collectKVs(order);
  let pickup: { date: string; time: string | null } | null = null;
  let ret: { date: string; time: string | null } | null = null;

  for (const kv of kvs) {
    const name = kv.name!;
    const value = kv.value!;
    if (!pickup && START_KEYS.test(name)) pickup = parseDateTime(value);
    else if (!ret && END_KEYS.test(name)) ret = parseDateTime(value);
  }

  // Kombi-Feld "Mietzeitraum: 12.07.2026 – 15.07.2026" (oder ISO, mit "bis"/"–"/"-")
  // Robust: alle Datums-Tokens extrahieren, erstes = Abholung, letztes = Rückgabe.
  if (!pickup || !ret) {
    for (const kv of kvs) {
      if (!RANGE_KEYS.test(kv.name!)) continue;
      const dates = [...kv.value!.matchAll(/\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}/g)].map(
        (m) => m[0]
      );
      const times = [...kv.value!.matchAll(/\d{1,2}:\d{2}/g)].map((m) => m[0]);
      if (dates.length >= 2) {
        const first = parseDateTime(dates[0]);
        const last = parseDateTime(dates[dates.length - 1]);
        if (first && times.length >= 2) first.time = times[0];
        if (last && times.length >= 2) last.time = times[times.length - 1];
        pickup = pickup ?? first;
        ret = ret ?? last;
      }
    }
  }
  return { pickup, ret };
};

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
  if (!/^orders\/(create|paid)$/.test(topic)) {
    return NextResponse.json({ ok: true, skipped: `Topic ${topic} wird ignoriert` });
  }

  const orgId = url.searchParams.get("org") ?? process.env.SHOPIFY_DEFAULT_ORG_ID ?? null;
  if (!orgId) return NextResponse.json({ error: "Keine Organisation (?org=…)" }, { status: 400 });

  let order: ShopifyOrder;
  try {
    order = JSON.parse(rawBody) as ShopifyOrder;
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  if (!order?.id) return NextResponse.json({ error: "Keine Bestell-ID" }, { status: 400 });

  const dryrun = url.searchParams.get("dryrun") === "1";
  const admin = createAdminClient();

  // Organisation validieren
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) return NextResponse.json({ error: "Organisation unbekannt" }, { status: 400 });

  // Idempotenz: Bestellung schon übernommen?
  if (!dryrun) {
    const { data: existing } = await admin
      .from("contracts")
      .select("id, contract_nr")
      .eq("org_id", orgId)
      .eq("shopify_order_id", String(order.id))
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, contract_nr: existing.contract_nr });
    }
  }

  // ── Zeitraum ──
  const { pickup, ret } = extractPeriod(order);
  if (!pickup || !ret) {
    // 200, damit Shopify nicht endlos retried — Bestellung ist kein Mietvorgang
    // oder das Buchungs-Setup liefert (noch) keine Datumsfelder.
    return NextResponse.json({
      ok: true,
      skipped: "Kein Mietzeitraum in der Bestellung gefunden (Properties/Note-Attributes prüfen)",
      order: order.name ?? order.id,
    });
  }

  // ── Fahrzeug / Kennzeichen ──
  // Kanonisches deutsches Format nach Normalisierung: "M-KP2847", optional E/H.
  const looksLikePlate = (s: string): boolean =>
    /^[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2}\d{1,4}[EH]?$/.test(s);

  const items = order.line_items ?? [];
  let plate: string | null = null;
  let vehicleType: string | null = null;

  for (const li of items) {
    // 1) Explizite Property "Kennzeichen" gewinnt immer
    const prop = (li.properties ?? []).find((p) => p.name && PLATE_KEYS.test(p.name));
    const fromProp = prop?.value ? normalizePlate(prop.value) : "";
    if (fromProp) {
      plate = fromProp;
      vehicleType = li.title ?? null;
      break;
    }
    // 2) SKU = Kennzeichen — nur wenn die SKU auch wie ein Kennzeichen aussieht
    //    (sonst wuerde jede Artikel-SKU wie "RENTAL-WEEKEND" faelschlich matchen)
    const fromSku = li.sku ? normalizePlate(li.sku) : "";
    if (fromSku && looksLikePlate(fromSku)) {
      plate = fromSku;
      vehicleType = li.title ?? null;
      break;
    }
  }

  // 3) Fallback: Produkttitel gegen die Flotte matchen (Hersteller+Modell ODER vehicle_type)
  if (!plate && items.length) {
    const { data: fleet } = await admin
      .from("vehicles")
      .select("plate, manufacturer, model, vehicle_type, status, decommission_date")
      .eq("org_id", orgId)
      .limit(300);
    const title = (items[0].title ?? "").toLowerCase();
    const hit = (fleet ?? []).find((v) => {
      const candidates = [
        [v.manufacturer, v.model].filter(Boolean).join(" "),
        v.vehicle_type ?? "",
      ];
      return candidates.some((name) => {
        const n = name.trim().toLowerCase();
        return n.length > 3 && title.includes(n);
      });
    });
    if (hit) {
      plate = hit.plate;
      vehicleType =
        [hit.manufacturer, hit.model].filter(Boolean).join(" ") || hit.vehicle_type;
    }
  }

  if (!plate) {
    return NextResponse.json({
      ok: true,
      skipped:
        "Kein Fahrzeug zuordenbar — SKU sollte das Kennzeichen enthalten (oder Property 'Kennzeichen')",
      order: order.name ?? order.id,
    });
  }

  // ── Kunde ──
  const sc = order.customer;
  const email = (sc?.email ?? order.email ?? "").trim().toLowerCase() || null;
  const firstName = sc?.first_name?.trim() || null;
  const lastName = sc?.last_name?.trim() || firstName || "Shopify-Kunde";
  const phone = sc?.phone?.trim() || sc?.default_address?.phone?.trim() || null;
  const addr = sc?.default_address ?? null;
  const renterName = [firstName, sc?.last_name?.trim()].filter(Boolean).join(" ") || lastName;
  const renterAddress = addr
    ? [addr.address1, [addr.zip, addr.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null
    : null;

  const result = {
    org: orgId,
    order: order.name ?? String(order.id),
    plate,
    vehicle_type: vehicleType,
    pickup_date: pickup.date,
    pickup_time: pickup.time,
    return_date: ret.date,
    return_time: ret.time,
    renter_name: renterName,
    renter_email: email,
    total_amount: order.total_price ? Number(order.total_price) : null,
  };

  if (dryrun) return NextResponse.json({ ok: true, dryrun: true, mapped: result });

  // Kunde matchen (Shopify-ID > E-Mail) oder anlegen
  let customerId: string | null = null;
  if (sc?.id) {
    const { data: byShopId } = await admin
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .eq("shopify_customer_id", String(sc.id))
      .maybeSingle();
    customerId = byShopId?.id ?? null;
  }
  if (!customerId && email) {
    const { data: byMail } = await admin
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .ilike("email", email)
      .maybeSingle();
    customerId = byMail?.id ?? null;
    if (customerId && sc?.id) {
      await admin
        .from("customers")
        .update({ shopify_customer_id: String(sc.id) })
        .eq("id", customerId);
    }
  }
  if (!customerId) {
    const { data: created, error: custErr } = await admin
      .from("customers")
      .insert({
        org_id: orgId,
        first_name: firstName,
        last_name: sc?.last_name?.trim() || lastName,
        email,
        phone,
        street: addr?.address1 ?? null,
        zip: addr?.zip ?? null,
        city: addr?.city ?? null,
        country: addr?.country ?? null,
        shopify_customer_id: sc?.id ? String(sc.id) : null,
      })
      .select("id")
      .single();
    if (custErr) return NextResponse.json({ error: `Kunde: ${custErr.message}` }, { status: 500 });
    customerId = created.id;
  }

  // Fahrzeug-Stub anlegen falls unbekannt (gleiches Verhalten wie manuelle Vertragsanlage)
  await admin
    .from("vehicles")
    .upsert(
      { org_id: orgId, plate, vehicle_type: vehicleType },
      { onConflict: "org_id,plate", ignoreDuplicates: true }
    );
  const { data: vehicle } = await admin
    .from("vehicles")
    .select("id")
    .eq("org_id", orgId)
    .eq("plate", plate)
    .maybeSingle();

  const orderLabel = order.name ?? `#${order.order_number ?? order.id}`;
  const { data: contract, error: insErr } = await admin
    .from("contracts")
    .insert({
      org_id: orgId,
      contract_nr: nextContractNr(),
      shopify_order_id: String(order.id),
      vehicle_id: vehicle?.id ?? null,
      customer_id: customerId,
      plate,
      vehicle_type: vehicleType,
      renter_name: renterName,
      renter_email: email,
      renter_phone: phone,
      renter_address: renterAddress,
      pickup_date: pickup.date,
      pickup_time: pickup.time,
      return_date: ret.date,
      return_time: ret.time,
      total_amount: order.total_price ? Number(order.total_price) : null,
      status: "aktiv",
      notes: `Automatisch übernommen aus Shopify-Bestellung ${orderLabel}${
        order.created_at ? ` vom ${order.created_at.slice(0, 10)}` : ""
      }.${order.note ? ` Hinweis des Kunden: ${order.note}` : ""}`,
      selected_special_terms: [],
    })
    .select("id, contract_nr")
    .single();
  if (insErr) {
    // Unique-Index (Doppel-Webhook im Race): als Duplikat behandeln
    if (insErr.message.includes("idx_contracts_shopify_order")) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: `Vertrag: ${insErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    contract_nr: contract.contract_nr,
    customer_id: customerId,
    mapped: result,
  });
};
