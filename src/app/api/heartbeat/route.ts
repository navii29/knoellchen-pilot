import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { HEARTBEAT_IDLE_GAP_S, HEARTBEAT_MAX_ADD_S, utcDay } from "@/lib/activity";

/**
 * Heartbeat des Dashboards (~alle 60 s vom Client). Akkumuliert die aktive Zeit
 * pro Tag: die Lücke seit dem letzten Ping wird gutgeschrieben — gedeckelt
 * (max. 90 s) und nur, wenn sie unter der Idle-Schwelle (5 min) liegt. So zählt
 * nur tatsächliche Anwesenheit, keine über Nacht offenen Tabs.
 */
export const POST = async (req: Request) => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { path?: unknown };
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;

  const day = utcDay(new Date());
  const admin = createAdminClient();

  // Atomare Akkumulation in der DB (Migration 053): Lückenberechnung + Schreiben
  // in einer Anweisung — kein Read-Modify-Write mehr, daher keine Lost/Double
  // Updates bei mehreren Tabs / gleichzeitigen Pings.
  await admin.rpc("record_heartbeat", {
    p_user_id: user.id,
    p_org_id: profile.org_id,
    p_day: day,
    p_path: path,
    p_idle_gap_s: HEARTBEAT_IDLE_GAP_S,
    p_max_add_s: HEARTBEAT_MAX_ADD_S,
  });

  return NextResponse.json({ ok: true });
};
