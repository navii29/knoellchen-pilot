import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { syncVehicleToLexoffice } from "@/lib/lexoffice-vehicle-sync";
import type { Vehicle } from "@/lib/types";

export const maxDuration = 60;

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

export const POST = async () => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("lexoffice_enabled, lexoffice_api_key")
    .eq("id", auth.org_id)
    .maybeSingle();
  if (!org?.lexoffice_enabled || !org.lexoffice_api_key) {
    return NextResponse.json(
      { error: "LexOffice ist nicht aktiviert oder kein API-Key hinterlegt." },
      { status: 400 }
    );
  }

  const { data: vehicles } = await admin
    .from("vehicles")
    .select("*")
    .eq("org_id", auth.org_id)
    .neq("status", "ausgesteuert")
    .is("lexoffice_product_id", null);

  const list = (vehicles ?? []) as Vehicle[];
  if (list.length === 0) {
    return NextResponse.json({ ok: true, total: 0, synced: 0, failed: 0 });
  }

  let synced = 0;
  const failures: string[] = [];
  for (const v of list) {
    const id = await syncVehicleToLexoffice(admin, v, auth.org_id);
    if (id) synced += 1;
    else failures.push(v.plate);
  }

  return NextResponse.json({
    ok: true,
    total: list.length,
    synced,
    failed: list.length - synced,
    failed_plates: failures,
  });
};
