import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  importCustomerFromOrder,
  processOrder,
  processProduct,
  type ShopifyOrder,
  type ShopifyProduct,
} from "@/lib/shopify";

/**
 * Erst-Import (Backfill) für bestehende Shopify-Shops:
 * holt alle Produkte (und optional offene Bestellungen) über die Admin-API
 * und zieht sie durch exakt dieselbe Strecke wie der Live-Webhook.
 *
 * Durch die Idempotenz-Indizes (shopify_product_id / shopify_order_id) ist der
 * Import beliebig wiederholbar: nichts wird doppelt angelegt oder überschrieben.
 *
 * Konfiguration (Env): SHOPIFY_SHOP_DOMAIN (z. B. mein-shop.myshopify.com)
 *                      SHOPIFY_ADMIN_TOKEN  (Custom-App, Scope read_products/read_orders)
 *
 * POST { dryrun?: boolean, include_orders?: boolean }
 * Auth: eingeloggter Dashboard-Nutzer (Import läuft für dessen Organisation).
 */

const API_VERSION = "2024-01";
const MAX_PAGES = 20; // Sicherheitskappe: 20 x 250 = 5000 Einträge je Typ

export const maxDuration = 300;

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

/** Shop-Basis-URL — https erzwungen; http nur für localhost außerhalb Production. */
const shopBaseUrl = (domain: string): string | null => {
  const d = domain.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!d) return null;
  const isLocal = d.startsWith("localhost") || d.startsWith("127.0.0.1");
  if (isLocal && process.env.NODE_ENV !== "production") return `http://${d}`;
  return `https://${d}`;
};

type ApiPage<T> = { items: T[]; nextPageInfo: string | null; error?: string };

/** Eine Seite der Admin-API holen; gibt Daten + page_info des nächsten Blatts zurück. */
const fetchPage = async <T>(
  base: string,
  token: string,
  resource: "products" | "orders",
  extraParams: string,
  pageInfo: string | null
): Promise<ApiPage<T>> => {
  // Shopify-Regel: mit page_info sind außer limit keine weiteren Filter erlaubt.
  const params = pageInfo
    ? `limit=250&page_info=${encodeURIComponent(pageInfo)}`
    : `limit=250${extraParams ? `&${extraParams}` : ""}`;
  const res = await fetch(`${base}/admin/api/${API_VERSION}/${resource}.json?${params}`, {
    headers: { "X-Shopify-Access-Token": token, "Content-Type": "application/json" },
    redirect: "error",
  });
  if (!res.ok) {
    return { items: [], nextPageInfo: null, error: `Shopify ${resource}: HTTP ${res.status}` };
  }
  const json = (await res.json()) as Record<string, T[]>;
  const items = json[resource] ?? [];

  // Pagination über den Link-Header: <…page_info=XYZ>; rel="next"
  let nextPageInfo: string | null = null;
  const link = res.headers.get("link") ?? "";
  const m = link.match(/<[^>]*[?&]page_info=([^>&]+)[^>]*>;\s*rel="next"/);
  if (m) nextPageInfo = decodeURIComponent(m[1]);

  return { items, nextPageInfo };
};

export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Zugangsdaten der Organisation (Self-Service, Einstellungen) — Env nur noch
  // als Fallback für lokale Entwicklung/Tests.
  const adminPre = createAdminClient();
  const { data: orgRow } = await adminPre
    .from("organizations")
    .select("shopify_shop_domain, shopify_admin_token")
    .eq("id", auth.org_id)
    .single();

  let domain = orgRow?.shopify_shop_domain ?? "";
  let token = orgRow?.shopify_admin_token ?? "";
  if (domain && !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain)) {
    // Org-Domains sind strikt auf *.myshopify.com begrenzt (SSRF-Schutz).
    return NextResponse.json({ error: "Hinterlegte Shop-Domain ist ungültig." }, { status: 400 });
  }
  if (!domain || !token) {
    domain = process.env.SHOPIFY_SHOP_DOMAIN ?? "";
    token = process.env.SHOPIFY_ADMIN_TOKEN ?? "";
  }

  const base = shopBaseUrl(domain);
  if (!base || !token) {
    return NextResponse.json(
      {
        error:
          "Shopify ist noch nicht verbunden — bitte Shop-Domain und Admin-API-Token in den Einstellungen speichern.",
      },
      { status: 503 }
    );
  }

  let body: {
    dryrun?: boolean;
    include_orders?: boolean;
    products_as_vehicles?: boolean;
    customers_from_orders?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* leerer Body ist ok */
  }
  const dryrun = body.dryrun === true;
  const includeOrders = body.include_orders === true;
  // Abo-Shops: Produkte ohne Kennzeichen-SKU als Fahrzeuge (Platzhalter-Kennzeichen)
  // bzw. Bestellungen ohne Mietzeitraum nur als Kunden übernehmen.
  const productsAsVehicles = body.products_as_vehicles === true;
  const customersFromOrders = body.customers_from_orders === true;

  const admin = createAdminClient();

  // ── Produkte → Fahrzeuge ──
  const products = {
    total: 0,
    created: 0,
    linked: 0,
    duplicates: 0,
    skipped: 0,
    errors: 0,
    photos_imported: 0,
    details: [] as { plate?: string; title?: string; status: string }[],
  };

  let pageInfo: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const pageRes: ApiPage<ShopifyProduct> = await fetchPage<ShopifyProduct>(
      base,
      token,
      "products",
      "",
      pageInfo
    );
    if (pageRes.error) return NextResponse.json({ error: pageRes.error }, { status: 502 });
    const items = pageRes.items;

    for (const product of items) {
      products.total++;
      const r = await processProduct(admin, auth.org_id, product, dryrun, {
        allowPlaceholder: productsAsVehicles,
      });
      const detail = {
        title: product.title ?? String(product.id),
        plate: "plate" in r ? r.plate : undefined,
        status: r.kind,
      };
      if (products.details.length < 25) products.details.push(detail);
      if (r.kind === "created") {
        products.created++;
        products.photos_imported += r.photos.imported;
      } else if (r.kind === "dryrun") products.created++; // würde angelegt
      else if (r.kind === "linked") products.linked++;
      else if (r.kind === "duplicate") products.duplicates++;
      else if (r.kind === "skipped") products.skipped++;
      else if (r.kind === "error") products.errors++;
    }

    if (!pageRes.nextPageInfo) break;
    pageInfo = pageRes.nextPageInfo;
  }

  // ── Offene Bestellungen → Kunden (immer) und/oder Verträge (optional) ──
  type Counter = {
    total: number;
    created: number;
    duplicates: number;
    skipped: number;
    errors: number;
  };
  let orders: Counter | null = null;
  let customers: Counter | null = null;

  if (includeOrders || customersFromOrders) {
    if (includeOrders) orders = { total: 0, created: 0, duplicates: 0, skipped: 0, errors: 0 };
    if (customersFromOrders)
      customers = { total: 0, created: 0, duplicates: 0, skipped: 0, errors: 0 };

    let oPageInfo: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const oRes: ApiPage<ShopifyOrder> = await fetchPage<ShopifyOrder>(
        base,
        token,
        "orders",
        "status=open",
        oPageInfo
      );
      if (oRes.error) return NextResponse.json({ error: oRes.error }, { status: 502 });

      for (const order of oRes.items) {
        if (customers) {
          customers.total++;
          const c = await importCustomerFromOrder(admin, auth.org_id, order, dryrun);
          if (c.kind === "created" || c.kind === "dryrun") customers.created++;
          else if (c.kind === "duplicate") customers.duplicates++;
          else if (c.kind === "skipped") customers.skipped++;
          else if (c.kind === "error") customers.errors++;
        }
        if (orders) {
          orders.total++;
          const r = await processOrder(admin, auth.org_id, order, dryrun);
          if (r.kind === "created" || r.kind === "dryrun") orders.created++;
          else if (r.kind === "duplicate") orders.duplicates++;
          else if (r.kind === "skipped") orders.skipped++;
          else if (r.kind === "error") orders.errors++;
        }
      }

      if (!oRes.nextPageInfo) break;
      oPageInfo = oRes.nextPageInfo;
    }
  }

  return NextResponse.json({ ok: true, dryrun, shop: domain, products, orders, customers });
};
