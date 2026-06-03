import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seedDemoData, unseedDemoData } from "@/lib/demo-seed";

const resolveOrgId = async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", status: 401 as const };
  const { data: profile } = await supabase
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "No profile", status: 401 as const };
  return { orgId: (profile as { org_id: string }).org_id };
};

export const POST = async () => {
  const r = await resolveOrgId();
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  try {
    const result = await seedDemoData(r.orgId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "seed failed" },
      { status: 500 }
    );
  }
};

export const DELETE = async () => {
  const r = await resolveOrgId();
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  try {
    await unseedDemoData(r.orgId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "remove failed" },
      { status: 500 }
    );
  }
};
