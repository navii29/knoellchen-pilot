import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { MAX_BULK, orgFromSession, parseIdList } from "@/lib/bulk";

// Mehrere Schadensberichte auf einmal löschen (nur eigene Org). Davor die
// zugehörigen Schadensfotos aus dem Storage entfernen (wie der Einzel-Delete).
export const POST = async (req: Request) => {
  const orgId = await orgFromSession();
  if (!orgId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ids = parseIdList(await req.json().catch(() => ({})));
  if (ids.length === 0)
    return NextResponse.json({ error: "Keine Auswahl übermittelt" }, { status: 400 });
  if (ids.length > MAX_BULK)
    return NextResponse.json({ error: `Maximal ${MAX_BULK} auf einmal` }, { status: 400 });

  const admin = createAdminClient();

  // Nur eigene Berichte + ihre Foto-Pfade laden.
  const { data: rows, error: loadErr } = await admin
    .from("damage_reports")
    .select("id, photos")
    .eq("org_id", orgId)
    .in("id", ids);
  if (loadErr)
    return NextResponse.json({ error: "Laden fehlgeschlagen" }, { status: 500 });

  const ownIds = (rows ?? []).map((r) => r.id as string);
  if (ownIds.length === 0) return NextResponse.json({ ok: true, deleted: 0 });

  const paths = (rows ?? [])
    .flatMap((r) => (Array.isArray(r.photos) ? (r.photos as string[]) : []))
    .filter((p): p is string => typeof p === "string" && p.length > 0);
  if (paths.length > 0) {
    await admin.storage.from("damage-photos").remove(paths);
  }

  const { error } = await admin
    .from("damage_reports")
    .delete()
    .eq("org_id", orgId)
    .in("id", ownIds);
  if (error)
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: ownIds.length });
};
