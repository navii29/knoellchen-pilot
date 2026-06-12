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

// Kanonisches deutsches Kennzeichen nach Normalisierung: "M-KP2847", optional E/H.
const looksLikePlate = (s: string): boolean =>
  /^[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2}\d{1,4}[EH]?$/.test(s);

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

  // ── products/create: neues Shop-Produkt → Fahrzeug im CRM ──
  if (isProduct) {
    return handleProductCreate(admin, orgId, payload as ShopifyProduct, dryrun);
  }

  const order = payload as ShopifyOrder;

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
    // ilike nur für Case-Insensitivität — LIKE-Metazeichen (%/_) aus dem
    // Shopify-Payload escapen, sonst matcht z. B. "%@%" fremde Kunden.
    const escapedEmail = email.replace(/[\\%_]/g, "\\$&");
    const { data: byMail } = await admin
      .from("customers")
      .select("id")
      .eq("org_id", orgId)
      .ilike("email", escapedEmail)
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

// ════════════════════════════════════════════════════════════════
// products/create — Shop-Produkt → Fahrzeug
// Konvention: Varianten-SKU = Kennzeichen (wie bei Bestellungen).
// Produktfotos (Shopify-CDN) werden in die Fahrzeug-Galerie übernommen.
// ════════════════════════════════════════════════════════════════

type ShopifyProduct = {
  id: number | string;
  title?: string | null;
  vendor?: string | null;
  status?: string | null; // active | draft | archived
  variants?: { sku?: string | null; price?: string | null }[] | null;
  images?: { src?: string | null }[] | null;
};

/** SSRF-Schutz: Bilder nur vom Shopify-CDN (lokal zusätzlich localhost für Tests). */
const photoUrlAllowed = (u: URL): boolean => {
  if (u.protocol === "https:" && u.hostname === "cdn.shopify.com") return true;
  if (
    process.env.NODE_ENV !== "production" &&
    (u.hostname === "localhost" || u.hostname === "127.0.0.1")
  )
    return true;
  return false;
};

const IMG_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const importProductPhotos = async (
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  vehicleId: string,
  images: { src?: string | null }[]
): Promise<{ imported: number; skipped: number }> => {
  let imported = 0;
  let skipped = 0;
  for (const [i, img] of images.slice(0, 8).entries()) {
    try {
      if (!img.src) {
        skipped++;
        continue;
      }
      const u = new URL(img.src);
      if (!photoUrlAllowed(u)) {
        skipped++;
        continue;
      }
      // redirect:"error" — keine Weiterleitungen, kein SSRF-Bounce
      const res = await fetch(u, { redirect: "error" });
      const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      const ext = IMG_TYPES[ct];
      if (!res.ok || !ext) {
        skipped++;
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0 || buf.length > 12 * 1024 * 1024) {
        skipped++;
        continue;
      }
      const path = `${orgId}/${vehicleId}/shopify-${Date.now().toString(36)}-${i}.${ext}`;
      const { error: upErr } = await admin.storage
        .from("vehicle-photos")
        .upload(path, buf, { contentType: ct, upsert: false });
      if (upErr) {
        skipped++;
        continue;
      }
      const { error: dbErr } = await admin
        .from("vehicle_photos")
        .insert({ vehicle_id: vehicleId, org_id: orgId, photo_path: path });
      if (dbErr) {
        skipped++;
        continue;
      }
      imported++;
    } catch {
      skipped++;
    }
  }
  return { imported, skipped };
};

const handleProductCreate = async (
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  product: ShopifyProduct,
  dryrun: boolean
) => {
  // Kennzeichen aus der ersten Variante, deren SKU wie ein Kennzeichen aussieht.
  // Bei Produkten strenger als bei Bestellungen: schon die ROHE SKU muss dem
  // Schild-Format entsprechen (max. 3 Buchstaben + Trennzeichen) — sonst wird
  // z. B. "GIFT-50" (Gutschein) fälschlich zum Fahrzeug "GIF-T50".
  const rawLooksLikePlate = (raw: string): boolean =>
    /^[A-ZÄÖÜ]{1,3}[-\s][A-ZÄÖÜ]{1,2}[-\s]?\d{1,4}[EH]?$/i.test(raw.trim());
  const variant = (product.variants ?? []).find((v) => {
    if (!v.sku || !rawLooksLikePlate(v.sku)) return false;
    const p = normalizePlate(v.sku);
    return p !== "" && looksLikePlate(p);
  });
  if (!variant) {
    return NextResponse.json({
      ok: true,
      skipped:
        "Kein Kennzeichen erkennbar — die Varianten-SKU sollte das Kennzeichen sein (z. B. 'B-KP 2041')",
      product: product.title ?? product.id,
    });
  }

  const plate = normalizePlate(variant.sku!);
  const vehicleType = product.title?.trim() || null;
  const manufacturer = product.vendor?.trim() || null;
  // Modell aus dem Titel ableiten: Vendor-Präfix(e) abschneiden
  // ("Mercedes C-Klasse Limousine" + Vendor "Mercedes-Benz" -> "C-Klasse Limousine").
  // Sonst baut der vehicle_type-Trigger nur "Mercedes-Benz" ohne Modell.
  const deriveModel = (): string | null => {
    if (!vehicleType) return null;
    let rest = vehicleType;
    if (manufacturer) {
      const tokens = new Set<string>([manufacturer.toLowerCase()]);
      for (const part of manufacturer.split(/[\s-]+/)) {
        if (part.length > 2) tokens.add(part.toLowerCase());
      }
      let changed = true;
      while (changed) {
        changed = false;
        for (const t of tokens) {
          if (rest.toLowerCase().startsWith(t)) {
            rest = rest.slice(t.length).replace(/^[\s-]+/, "");
            changed = true;
          }
        }
      }
    }
    return rest.trim() || vehicleType;
  };
  const model = deriveModel();
  const dailyRate = variant.price != null && variant.price !== "" ? Number(variant.price) : null;
  const status = product.status === "active" ? "aktiv" : "inaktiv";

  const images = (product.images ?? []).filter((im) => im.src);
  const importable = images.filter((im) => {
    try {
      return photoUrlAllowed(new URL(im.src!));
    } catch {
      return false;
    }
  }).length;

  const mapped = {
    plate,
    vehicle_type: vehicleType,
    manufacturer,
    model,
    daily_rate: dailyRate,
    status,
    images_total: images.length,
    images_importable: importable,
  };
  if (dryrun) return NextResponse.json({ ok: true, dryrun: true, mapped });

  // Idempotenz: Produkt schon übernommen?
  const { data: byProduct } = await admin
    .from("vehicles")
    .select("id, plate")
    .eq("org_id", orgId)
    .eq("shopify_product_id", String(product.id))
    .maybeSingle();
  if (byProduct) {
    return NextResponse.json({ ok: true, duplicate: true, plate: byProduct.plate });
  }

  // Kennzeichen existiert bereits? Dann nur verknüpfen, nichts überschreiben.
  const { data: byPlate } = await admin
    .from("vehicles")
    .select("id, shopify_product_id")
    .eq("org_id", orgId)
    .eq("plate", plate)
    .maybeSingle();
  if (byPlate) {
    if (!byPlate.shopify_product_id) {
      await admin
        .from("vehicles")
        .update({ shopify_product_id: String(product.id) })
        .eq("id", byPlate.id);
    }
    return NextResponse.json({ ok: true, linked: true, plate, mapped });
  }

  const { data: vehicle, error: insErr } = await admin
    .from("vehicles")
    .insert({
      org_id: orgId,
      plate,
      vehicle_type: vehicleType,
      manufacturer,
      model,
      daily_rate: dailyRate,
      status,
      shopify_product_id: String(product.id),
    })
    .select("id")
    .single();
  if (insErr) {
    if (insErr.message.includes("idx_vehicles_shopify_product")) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: `Fahrzeug: ${insErr.message}` }, { status: 500 });
  }

  // Produktfotos in die Galerie (best effort — Fehler brechen den Webhook nicht)
  const photos = images.length
    ? await importProductPhotos(admin, orgId, vehicle.id, images)
    : { imported: 0, skipped: 0 };

  return NextResponse.json({ ok: true, vehicle_id: vehicle.id, mapped, photos });
};
