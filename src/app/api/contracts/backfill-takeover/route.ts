import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/team";
import { applyTakeover } from "@/lib/contract-takeover-service";

// Bestands-Backfill: legt für bereits importierte Verträge (ohne customer_id)
// nachträglich Kunden an/verknüpft sie und backfillt die Fahrzeuge. Idempotent
// (verarbeitet nur Verträge ohne customer_id) und org-scoped.
export const maxDuration = 60;

const PAGE = 300;
const MAX = 10000;

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
  return profile ? { user, org_id: profile.org_id as string } : null;
};

export const POST = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gate = await requirePermission("import_export");
  if (!gate.ok) return gate.res;

  const admin = createAdminClient();
  let processed = 0;

  // Verträge ohne Kundenverknüpfung seitenweise verarbeiten. Da applyTakeover
  // customer_id setzt, schrumpft die Restmenge — daher immer die ERSTE Seite
  // der noch unverknüpften Verträge ziehen, bis keine mehr übrig sind.
  for (let guard = 0; guard < MAX / PAGE + 1; guard++) {
    const { data, error } = await admin
      .from("contracts")
      .select("id")
      .eq("org_id", auth.org_id)
      .is("customer_id", null)
      .order("pickup_date", { ascending: false })
      .limit(PAGE);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
    if (ids.length === 0) break;

    await applyTakeover(admin, auth.org_id, ids);
    processed += ids.length;

    if (ids.length < PAGE) break;
  }

  return NextResponse.json({ ok: true, processed });
};
