import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { MAX_BULK, orgFromSession, parseIdList } from "@/lib/bulk";

// Mehrere Fahrzeuge auf einmal löschen (nur eigene Org). Mit einem Vertrag
// verknüpfte Fahrzeuge sind per FK geschützt — dann schlägt die Aktion ab.
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
    .from("vehicles")
    .delete({ count: "exact" })
    .eq("org_id", orgId)
    .in("id", ids);
  if (error)
    return NextResponse.json(
      {
        error:
          "Löschen fehlgeschlagen — vermutlich ist mindestens ein Fahrzeug noch mit einem Vertrag verknüpft.",
      },
      { status: 500 }
    );

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
};
