import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Health- und Keep-alive-Endpoint.
//
// Zweck 1 (Keep-alive): Wird taeglich vom Vercel-Cron aufgerufen (siehe
// vercel.json), damit das Supabase-Projekt nicht nach ~7 Tagen Inaktivitaet
// automatisch pausiert. Eine pausierte DB legt Login + komplette App lahm.
// Zweck 2 (Monitoring): Oeffentlicher Status-Endpoint, den ein Uptime-Monitor
// (z.B. UptimeRobot) ueberwachen kann, um bei einem Ausfall sofort zu alarmieren.
//
// Sicherheit: Wenn CRON_SECRET in den Env-Vars gesetzt ist, wird der Aufruf
// geschuetzt (Vercel sendet den Header automatisch mit). Ohne gesetztes Secret
// bleibt der Endpoint oeffentlich erreichbar, gibt aber nur Status-Infos preis.
export const dynamic = "force-dynamic";

export const GET = async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") !== null;
    if (authHeader !== `Bearer ${secret}` && !isVercelCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startedAt = Date.now();
  try {
    const admin = createAdminClient();
    // Minimale DB-Query (head:true -> kein Datentransfer, nur ein Count).
    // Beruehrt die Datenbank und haelt das Projekt damit aktiv.
    const { error } = await admin
      .from("organizations")
      .select("id", { count: "exact", head: true });

    const ms = Date.now() - startedAt;
    if (error) {
      return NextResponse.json(
        { status: "error", supabase: "down", error: error.message, ms },
        { status: 503 }
      );
    }
    return NextResponse.json({ status: "ok", supabase: "up", ms });
  } catch (e) {
    const ms = Date.now() - startedAt;
    return NextResponse.json(
      {
        status: "error",
        supabase: "down",
        error: e instanceof Error ? e.message : "unknown",
        ms,
      },
      { status: 503 }
    );
  }
};
