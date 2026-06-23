import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/team";

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

// Mehrere Kunden auf einmal löschen. Nur Datensätze der eigenen Org; davor
// werden die sensiblen Ausweis-/Führerschein-Dateien aus dem Storage entfernt
// (GDPR), Portal-Logins per ON DELETE CASCADE; Verträge behalten ihren
// renter_name-Snapshot (FK ON DELETE SET NULL).
export const POST = async (req: Request) => {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const gate = await requirePermission("delete");
  if (!gate.ok) return gate.res;

  const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(body.ids)
    ? Array.from(new Set(body.ids.filter((x): x is string => typeof x === "string")))
    : [];
  if (ids.length === 0)
    return NextResponse.json({ error: "Keine Auswahl übermittelt" }, { status: 400 });
  if (ids.length > 1000)
    return NextResponse.json({ error: "Maximal 1000 auf einmal" }, { status: 400 });

  const admin = createAdminClient();

  // Nur eigene Kunden + deren Storage-Pfade laden (begrenzt den Effekt auf die Org).
  const { data: rows, error: loadErr } = await admin
    .from("customers")
    .select("id, license_photo_path, id_card_photo_path")
    .eq("org_id", auth.org_id)
    .in("id", ids);
  if (loadErr)
    return NextResponse.json({ error: "Laden fehlgeschlagen" }, { status: 500 });

  const ownIds = (rows ?? []).map((r) => r.id as string);
  if (ownIds.length === 0)
    return NextResponse.json({ ok: true, deleted: 0 });

  const paths = (rows ?? [])
    .flatMap((r) => [r.license_photo_path, r.id_card_photo_path])
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  if (paths.length > 0) {
    await admin.storage.from("customer-documents").remove(paths);
  }

  const { error } = await admin
    .from("customers")
    .delete()
    .eq("org_id", auth.org_id)
    .in("id", ownIds);
  if (error)
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: ownIds.length });
};
