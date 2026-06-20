import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { MAX_BULK, orgFromSession, parseIdList } from "@/lib/bulk";

// Mehrere Strafzettel auf einmal löschen (nur eigene Org).
export const POST = async (req: Request) => {
  const orgId = await orgFromSession();
  if (!orgId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ids = parseIdList(await req.json().catch(() => ({})));
  if (ids.length === 0)
    return NextResponse.json({ error: "Keine Auswahl übermittelt" }, { status: 400 });
  if (ids.length > MAX_BULK)
    return NextResponse.json({ error: `Maximal ${MAX_BULK} auf einmal` }, { status: 400 });

  const admin = createAdminClient();
  const { error, count } = await admin
    .from("tickets")
    .delete({ count: "exact" })
    .eq("org_id", orgId)
    .in("id", ids);
  if (error)
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
};
