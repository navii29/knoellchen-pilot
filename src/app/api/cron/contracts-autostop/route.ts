import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Täglicher Cron: Beendet Verträge, deren Rückgabedatum vor heute liegt.
// Strikte < Bedingung: Ein Vertrag wird erst am Tag NACH dem Rückgabedatum
// abgeschlossen — nie am letzten Tag selbst. Verlängerungen sind automatisch
// berücksichtigt, da das return_date bereits vorwärts verschoben wurde.
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
  const today = new Date().toISOString().slice(0, 10);
  let stopped = 0;

  const { data: contracts } = await admin
    .from("contracts")
    .select("id, org_id, plate, return_date")
    .eq("status", "aktiv")
    .lt("return_date", today);

  for (const c of contracts ?? []) {
    try {
      const { error } = await admin
        .from("contracts")
        .update({ status: "abgeschlossen", updated_at: new Date().toISOString() })
        .eq("id", c.id)
        .eq("org_id", c.org_id);

      if (!error) stopped++;
    } catch {
      // Einzelner Fehler darf den Rest nicht abbrechen
    }
  }

  return NextResponse.json({ ok: true, stopped });
};
