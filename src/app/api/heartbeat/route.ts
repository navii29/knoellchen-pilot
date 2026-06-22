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

  const now = new Date();
  const day = utcDay(now);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("user_activity_daily")
    .select("active_seconds, last_active")
    .eq("user_id", user.id)
    .eq("day", day)
    .maybeSingle();

  let activeSeconds = 0;
  if (existing) {
    const gap = (now.getTime() - new Date(existing.last_active as string).getTime()) / 1000;
    const add = gap > 0 && gap < HEARTBEAT_IDLE_GAP_S ? Math.min(gap, HEARTBEAT_MAX_ADD_S) : 0;
    activeSeconds = Math.round((Number(existing.active_seconds) || 0) + add);
  }

  await admin.from("user_activity_daily").upsert(
    {
      user_id: user.id,
      org_id: profile.org_id,
      day,
      active_seconds: activeSeconds,
      last_active: now.toISOString(),
      current_path: path,
    },
    { onConflict: "user_id,day" }
  );

  return NextResponse.json({ ok: true });
};
