import { createAdminClient } from "@/lib/supabase/server";
import { nextContractNr } from "@/lib/contract-utils";
import { normalizePlate } from "@/lib/plate";

/**
 * Gemeinsame Shopify-Logik für Webhook (Live-Ereignisse) und Erst-Import
 * (Backfill bestehender Shops). Beide Wege nutzen exakt dasselbe Mapping
 * und dieselben Schutzmechanismen (Idempotenz, SSRF-Allowlist, Kennzeichen-
 * Plausibilität).
 */

type Admin = ReturnType<typeof createAdminClient>;

// ── Typen (Shopify-Payloads) ────────────────────────────────────

export type KV = { name?: string | null; value?: string | null };

export type ShopifyLineItem = {
  title?: string | null;
  sku?: string | null;
  quantity?: number;
  price?: string | null;
  properties?: KV[] | null;
};

export type ShopifyOrder = {
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

export type ShopifyProduct = {
  id: number | string;
  title?: string | null;
  vendor?: string | null;
  status?: string | null; // active | draft | archived
  variants?: { sku?: string | null; price?: string | null }[] | null;
  images?: { src?: string | null }[] | null;
};

// ── Kennzeichen-Heuristiken ─────────────────────────────────────

/** Kanonisches deutsches Kennzeichen nach Normalisierung: "M-KP2847", optional E/H. */
export const looksLikePlate = (s: string): boolean =>
  /^[A-ZÄÖÜ]{1,3}-[A-ZÄÖÜ]{1,2}\d{1,4}[EH]?$/.test(s);

/**
 * Strenger (für Produkte): schon die ROHE SKU muss dem Schild-Format entsprechen
 * (max. 3 Buchstaben + Trennzeichen) — sonst wird z. B. "GIFT-50" zum Fahrzeug.
 */
export const rawLooksLikePlate = (raw: string): boolean =>
  /^[A-ZÄÖÜ]{1,3}[-\s][A-ZÄÖÜ]{1,2}[-\s]?\d{1,4}[EH]?$/i.test(raw.trim());

// ── Zeitraum-Parsing (Bestellungen) ─────────────────────────────

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
): {
  pickup: { date: string; time: string | null } | null;
  ret: { date: string; time: string | null } | null;
} => {
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

// ── Foto-Import (SSRF-gehärtet) ─────────────────────────────────

/** Bilder nur vom Shopify-CDN (lokal zusätzlich localhost für Tests). */
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
  admin: Admin,
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

// Nächstes freies Platzhalter-Kennzeichen ABO-#### (für Abo-Modelle ohne SKU).
const nextPlaceholderPlate = async (admin: Admin, orgId: string): Promise<string> => {
  const { data } = await admin
    .from("vehicles")
    .select("plate")
    .eq("org_id", orgId)
    .ilike("plate", "ABO-%");
  let max = 0;
  for (const r of (data ?? []) as { plate: string }[]) {
    const m = /^ABO-0*(\d+)$/i.exec(r.plate);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `ABO-${String(max + 1).padStart(4, "0")}`;
};

// Kunde aus einer Bestellung matchen (Shopify-ID > E-Mail) oder neu anlegen.
const resolveOrInsertCustomer = async (
  admin: Admin,
  orgId: string,
  order: ShopifyOrder
): Promise<{ customerId: string | null; created: boolean }> => {
  const sc = order.customer;
  const email = (sc?.email ?? order.email ?? "").trim().toLowerCase() || null;
  const firstName = sc?.first_name?.trim() || null;
  const lastName = sc?.last_name?.trim() || firstName || "Shopify-Kunde";
  const phone = sc?.phone?.trim() || sc?.default_address?.phone?.trim() || null;
  const addr = sc?.default_address ?? null;

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
  if (customerId) return { customerId, created: false };

  const { data: created, error } = await admin
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
  if (error || !created) return { customerId: null, created: false };
  return { customerId: created.id, created: true };
};

// ── Bestellung → nur Kunde (ohne Mietzeitraum/Kennzeichen) ──────
export type CustomerResult =
  | { kind: "skipped"; reason: string; order: string | number }
  | { kind: "dryrun"; mapped: Record<string, unknown> }
  | { kind: "duplicate" }
  | { kind: "created"; customer_id: string }
  | { kind: "error"; message: string };

export const importCustomerFromOrder = async (
  admin: Admin,
  orgId: string,
  order: ShopifyOrder,
  dryrun: boolean
): Promise<CustomerResult> => {
  const sc = order.customer;
  const email = (sc?.email ?? order.email ?? "").trim().toLowerCase() || null;
  const name = [sc?.first_name?.trim(), sc?.last_name?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!name && !email) {
    return {
      kind: "skipped",
      reason: "Bestellung ohne Kundenname und E-Mail",
      order: order.name ?? order.id,
    };
  }
  if (dryrun) return { kind: "dryrun", mapped: { name: name || "(ohne Name)", email } };

  const { customerId, created } = await resolveOrInsertCustomer(admin, orgId, order);
  if (!customerId) return { kind: "error", message: "Kunde konnte nicht angelegt werden" };
  return created ? { kind: "created", customer_id: customerId } : { kind: "duplicate" };
};

// ── Produkt → Fahrzeug ──────────────────────────────────────────

export type ProductResult =
  | { kind: "skipped"; reason: string; product: string | number }
  | { kind: "dryrun"; mapped: Record<string, unknown> }
  | { kind: "duplicate"; plate?: string }
  | { kind: "linked"; plate: string; mapped: Record<string, unknown> }
  | {
      kind: "created";
      vehicle_id: string;
      plate: string;
      mapped: Record<string, unknown>;
      photos: { imported: number; skipped: number };
    }
  | { kind: "error"; message: string };

export const processProduct = async (
  admin: Admin,
  orgId: string,
  product: ShopifyProduct,
  dryrun: boolean,
  opts: { allowPlaceholder?: boolean } = {}
): Promise<ProductResult> => {
  // Kennzeichen aus der ersten Variante, deren SKU wie ein Kennzeichen aussieht
  const variant = (product.variants ?? []).find((v) => {
    if (!v.sku || !rawLooksLikePlate(v.sku)) return false;
    const p = normalizePlate(v.sku);
    return p !== "" && looksLikePlate(p);
  });
  const isPlaceholder = !variant;
  if (isPlaceholder && !opts.allowPlaceholder) {
    return {
      kind: "skipped",
      reason:
        "Kein Kennzeichen erkennbar — die Varianten-SKU sollte das Kennzeichen sein (z. B. 'B-KP 2041')",
      product: product.title ?? product.id,
    };
  }

  const vehicleType = product.title?.trim() || null;
  const manufacturer = product.vendor?.trim() || null;
  // Modell aus dem Titel ableiten: Vendor-Präfix(e) abschneiden
  // ("Mercedes C-Klasse Limousine" + Vendor "Mercedes-Benz" -> "C-Klasse Limousine").
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
  // Bei echtem SKU-Kennzeichen den Variantenpreis als Tagespreis übernehmen.
  // Bei Abo-Modellen ist der Preis ein Laufzeit-/Abopreis (kein Tagespreis) →
  // daily_rate leer lassen, damit nichts Falsches in der Marge landet.
  const dailyRate =
    variant && variant.price != null && variant.price !== ""
      ? Number(variant.price)
      : null;
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
    plate: variant ? normalizePlate(variant.sku!) : "ABO-#### (neu)",
    vehicle_type: vehicleType,
    manufacturer,
    model,
    daily_rate: dailyRate,
    status,
    placeholder: isPlaceholder,
    images_total: images.length,
    images_importable: importable,
  };
  if (dryrun) return { kind: "dryrun", mapped };

  // Idempotenz: Produkt schon übernommen?
  const { data: byProduct } = await admin
    .from("vehicles")
    .select("id, plate")
    .eq("org_id", orgId)
    .eq("shopify_product_id", String(product.id))
    .maybeSingle();
  if (byProduct) return { kind: "duplicate", plate: byProduct.plate };

  let plate: string;
  if (variant) {
    plate = normalizePlate(variant.sku!);
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
      return { kind: "linked", plate, mapped };
    }
  } else {
    // Abo-Modell ohne Kennzeichen → Platzhalter ABO-#### (später umbenennbar).
    plate = await nextPlaceholderPlate(admin, orgId);
  }

  const insertVehicle = (p: string) =>
    admin
      .from("vehicles")
      .insert({
        org_id: orgId,
        plate: p,
        vehicle_type: vehicleType,
        manufacturer,
        model,
        daily_rate: dailyRate,
        status,
        shopify_product_id: String(product.id),
      })
      .select("id")
      .single();

  let { data: vehicle, error: insErr } = await insertVehicle(plate);
  if (insErr && isPlaceholder && /duplicate|unique|plate/i.test(insErr.message)) {
    plate = `ABO-${String(product.id).slice(-6)}`;
    ({ data: vehicle, error: insErr } = await insertVehicle(plate));
  }
  if (insErr) {
    if (insErr.message.includes("idx_vehicles_shopify_product")) {
      return { kind: "duplicate" };
    }
    return { kind: "error", message: `Fahrzeug: ${insErr.message}` };
  }

  // Produktfotos in die Galerie (best effort — Fehler brechen nichts)
  const photos = images.length
    ? await importProductPhotos(admin, orgId, vehicle!.id, images)
    : { imported: 0, skipped: 0 };

  return { kind: "created", vehicle_id: vehicle!.id, plate, mapped, photos };
};

// ── Bestellung → Kunde + Vertrag ────────────────────────────────

export type OrderResult =
  | { kind: "skipped"; reason: string; order: string | number }
  | { kind: "dryrun"; mapped: Record<string, unknown> }
  | { kind: "duplicate"; contract_nr?: string }
  | {
      kind: "created";
      contract_nr: string;
      customer_id: string;
      mapped: Record<string, unknown>;
    }
  | { kind: "error"; message: string };

export const processOrder = async (
  admin: Admin,
  orgId: string,
  order: ShopifyOrder,
  dryrun: boolean
): Promise<OrderResult> => {
  // Idempotenz: Bestellung schon übernommen?
  if (!dryrun) {
    const { data: existing } = await admin
      .from("contracts")
      .select("id, contract_nr")
      .eq("org_id", orgId)
      .eq("shopify_order_id", String(order.id))
      .maybeSingle();
    if (existing) return { kind: "duplicate", contract_nr: existing.contract_nr };
  }

  // ── Zeitraum ──
  const { pickup, ret } = extractPeriod(order);
  if (!pickup || !ret) {
    return {
      kind: "skipped",
      reason: "Kein Mietzeitraum in der Bestellung gefunden (Properties/Note-Attributes prüfen)",
      order: order.name ?? order.id,
    };
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
      vehicleType = [hit.manufacturer, hit.model].filter(Boolean).join(" ") || hit.vehicle_type;
    }
  }

  if (!plate) {
    return {
      kind: "skipped",
      reason:
        "Kein Fahrzeug zuordenbar — SKU sollte das Kennzeichen enthalten (oder Property 'Kennzeichen')",
      order: order.name ?? order.id,
    };
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
    ? [addr.address1, [addr.zip, addr.city].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ") || null
    : null;

  const mapped = {
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

  if (dryrun) return { kind: "dryrun", mapped };

  // Kunde matchen (Shopify-ID > E-Mail) oder anlegen
  const { customerId } = await resolveOrInsertCustomer(admin, orgId, order);
  if (!customerId) return { kind: "error", message: "Kunde konnte nicht ermittelt werden" };

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
    if (insErr.message.includes("idx_contracts_shopify_order")) {
      return { kind: "duplicate" };
    }
    return { kind: "error", message: `Vertrag: ${insErr.message}` };
  }

  return { kind: "created", contract_nr: contract.contract_nr, customer_id: customerId, mapped };
};
