import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getMembership } from "@/lib/team";

export const maxDuration = 30;

// Org-skopierte Tabellen mit org_id-Spalte.
const ORG_TABLES = [
  "vehicles",
  "bookings",
  "contracts",
  "customers",
  "tickets",
  "damage_reports",
  "handover_photos",
  "vehicle_events",
  "vehicle_tires",
  "vehicle_photos",
  "vehicle_partner_pricing",
  "pricing_rules",
  "special_terms_templates",
  "sales_partners",
] as const;

// Felder, die nicht exportiert werden (Geheimnisse/Hashes).
const STRIP: Record<string, string[]> = {
  organizations: ["lexoffice_api_key", "echoes_api_key", "shopify_admin_token", "shopify_webhook_token"],
  customer_logins: ["password_hash", "magic_token", "magic_token_expires"],
};

const strip = (rows: Record<string, unknown>[] | null, table: string) => {
  const keys = STRIP[table];
  if (!rows || !keys) return rows ?? [];
  return rows.map((r) => {
    const c = { ...r };
    for (const k of keys) delete c[k];
    return c;
  });
};

/**
 * DSGVO Art. 20 — Datenexport. Liefert alle Daten der Organisation als
 * maschinenlesbares JSON zum Download. Nur Inhaber.
 */
export const GET = async () => {
  const me = await getMembership();
  if (!me) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (me.role !== "owner")
    return NextResponse.json({ error: "Nur Inhaber können Daten exportieren." }, { status: 403 });

  const admin = createAdminClient();
  const orgId = me.orgId;
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    org_id: orgId,
    format: "knoellchen-pilot-export-v1",
  };

  // Stammtabellen
  const [{ data: org }, { data: users }] = await Promise.all([
    admin.from("organizations").select("*").eq("id", orgId).maybeSingle(),
    admin.from("users").select("*").eq("org_id", orgId),
  ]);
  out.organization = org ? strip([org], "organizations")[0] : null;
  out.users = users ?? [];

  // Org-skopierte Tabellen
  const results = await Promise.all(
    ORG_TABLES.map(async (t) => {
      const { data } = await admin.from(t).select("*").eq("org_id", orgId);
      return [t, data ?? []] as const;
    })
  );
  for (const [t, rows] of results) out[t] = rows;

  // customer_logins (Geheimnisse strippen)
  const { data: logins } = await admin.from("customer_logins").select("*").eq("org_id", orgId);
  out.customer_logins = strip(logins, "customer_logins");

  // Kind-Tabellen ohne org_id über Eltern
  const ticketIds = (out.tickets as { id: string }[]).map((t) => t.id);
  if (ticketIds.length) {
    const { data: logs } = await admin.from("ticket_logs").select("*").in("ticket_id", ticketIds);
    out.ticket_logs = logs ?? [];
  } else {
    out.ticket_logs = [];
  }
  const tireIds = (out.vehicle_tires as { id: string }[]).map((t) => t.id);
  if (tireIds.length) {
    const { data: tp } = await admin.from("tire_photos").select("*").in("tire_id", tireIds);
    out.tire_photos = tp ?? [];
  } else {
    out.tire_photos = [];
  }

  const body = JSON.stringify(out, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="knoellchen-pilot-export-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
};
