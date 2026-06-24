import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyOnce } from "@/lib/notify";
import { requireCron } from "@/lib/cron-auth";

// Täglicher Reminder-Cron (Vercel). Legt In-Portal-Benachrichtigungen an:
// Rückgabe morgen, Vertrag unsigniert, offener weiterbelasteter Strafzettel.
// Nur für Verträge mit Kundenkonto (customer_id gesetzt). Dedup via notifyOnce.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE = 1000;

// PostgREST liefert per Default max. 1000 Zeilen. Ohne Pagination werden
// >1000 Treffer still übersprungen (Reminder bleibt aus). Dieser Helper liest
// seitenweise via .range() bis eine Seite < PAGE Zeilen liefert.
type RangeQuery<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }> & {
  range: (from: number, to: number) => RangeQuery<T>;
};

const fetchAll = async <T>(build: () => RangeQuery<T>): Promise<T[]> => {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await build().range(offset, offset + PAGE - 1);
    if (error) {
      console.error("reminders cron: query page failed", error.message);
      break;
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
};

export const GET = async (req: Request) => {
  const denied = requireCron(req);
  if (denied) return denied;

  const admin = createAdminClient();
  let created = 0;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  // 1) Rückgabe morgen fällig
  const due = await fetchAll<{
    id: string;
    customer_id: string;
    org_id: string;
    plate: string;
    return_date: string;
  }>(() =>
    admin
      .from("contracts")
      .select("id, customer_id, org_id, plate, return_date")
      .eq("status", "aktiv")
      .eq("return_date", tomorrow)
      .not("customer_id", "is", null)
  );
  for (const c of due) {
    if (
      await notifyOnce({
        customer_id: c.customer_id,
        org_id: c.org_id,
        type: "return_due",
        title: "Rückgabe morgen",
        body: `Dein Fahrzeug ${c.plate} ist morgen zur Rückgabe fällig.`,
        link: `/portal/contracts/${c.id}`,
      })
    )
      created++;
  }

  // 2) Unsignierte aktive Verträge
  const unsigned = await fetchAll<{ id: string; customer_id: string; org_id: string }>(() =>
    admin
      .from("contracts")
      .select("id, customer_id, org_id")
      .eq("status", "aktiv")
      .is("signed_at", null)
      .not("customer_id", "is", null)
  );
  for (const c of unsigned) {
    if (
      await notifyOnce({
        customer_id: c.customer_id,
        org_id: c.org_id,
        type: "sign",
        title: "Vertrag unterschreiben",
        body: "Bitte unterschreibe deinen Mietvertrag im Portal.",
        link: `/portal/contracts/${c.id}`,
      })
    )
      created++;
  }

  // 3) Offene weiterbelastete Strafzettel
  const tickets = await fetchAll<{
    id: string;
    org_id: string;
    total_charge: number | null;
    contract_id: string;
    contracts?: { customer_id?: string } | { customer_id?: string }[];
  }>(() =>
    admin
      .from("tickets")
      .select("id, org_id, total_charge, contract_id, contracts(customer_id)")
      .eq("status", "weiterbelastet")
      .eq("paid", false)
      .not("contract_id", "is", null)
  );
  for (const t of tickets) {
    const rel = t.contracts;
    const cust = Array.isArray(rel) ? rel[0]?.customer_id : rel?.customer_id;
    if (!cust || t.total_charge == null) continue;
    if (
      await notifyOnce({
        customer_id: cust,
        org_id: t.org_id,
        type: "ticket",
        title: "Offener Betrag",
        body: "Ein weiterbelasteter Strafzettel ist noch offen.",
        link: `/portal/strafzettel/${t.id}`,
      })
    )
      created++;
  }

  return NextResponse.json({ ok: true, created });
};
