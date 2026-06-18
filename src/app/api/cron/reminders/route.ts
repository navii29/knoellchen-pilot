import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyOnce } from "@/lib/notify";

// Täglicher Reminder-Cron (Vercel). Legt In-Portal-Benachrichtigungen an:
// Rückgabe morgen, Vertrag unsigniert, offener weiterbelasteter Strafzettel.
// Nur für Verträge mit Kundenkonto (customer_id gesetzt). Dedup via notifyOnce.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") !== null;
    if (auth !== `Bearer ${secret}` && !isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  let created = 0;
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  // 1) Rückgabe morgen fällig
  const { data: due } = await admin
    .from("contracts")
    .select("id, customer_id, org_id, plate, return_date")
    .eq("status", "aktiv")
    .eq("return_date", tomorrow)
    .not("customer_id", "is", null);
  for (const c of due ?? []) {
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
  const { data: unsigned } = await admin
    .from("contracts")
    .select("id, customer_id, org_id")
    .eq("status", "aktiv")
    .is("signed_at", null)
    .not("customer_id", "is", null);
  for (const c of unsigned ?? []) {
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
  const { data: tickets } = await admin
    .from("tickets")
    .select("id, org_id, total_charge, contract_id, contracts(customer_id)")
    .eq("status", "weiterbelastet")
    .eq("paid", false)
    .not("contract_id", "is", null);
  for (const t of tickets ?? []) {
    const rel = (t as { contracts?: { customer_id?: string } | { customer_id?: string }[] })
      .contracts;
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
